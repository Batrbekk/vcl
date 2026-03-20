"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Phone, PhoneOff, Clock, AlertCircle, Mic } from "lucide-react";
import { VoiceOrb } from "@/components/bot/voice-orb";

interface TranscriptMessage {
  role: "assistant" | "user";
  text: string;
  timestamp: number;
}

interface CallAnalysis {
  summary: string;
  sentiment: string;
  qualificationScore: number;
  clientName: string | null;
  budget: string | null;
  interest: string | null;
  timeline: string | null;
  nextStep: string | null;
}

type CallStatus = "idle" | "connecting" | "active" | "ended" | "error";

interface VoiceChatProps {
  systemPrompt: string;
  greeting: string;
  voiceId?: string;
}

export function VoiceChat({ systemPrompt, greeting, voiceId }: VoiceChatProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [orbState, setOrbState] = useState<"idle" | "listening" | "speaking">("idle");
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const processingRef = useRef(false);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    if (callStatus === "active") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (callStatus === "idle") setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStatus]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const addMessage = useCallback((role: "assistant" | "user", text: string) => {
    const entry: TranscriptMessage = {
      role,
      text,
      timestamp: Date.now() - startTimeRef.current,
    };
    transcriptRef.current = [...transcriptRef.current, entry];
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const speak = useCallback(async (text: string) => {
    setOrbState("speaking");
    setVolume(0.2);

    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, referenceId: voiceId || undefined }),
      });

      if (!res.ok) {
        console.warn("TTS error:", res.status);
        if (activeRef.current) setOrbState("listening");
        setVolume(0);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("json")) {
        // Error response
        console.warn("TTS returned error JSON");
        if (activeRef.current) setOrbState("listening");
        setVolume(0);
        return;
      }

      const blob = await res.blob();
      if (blob.size < 100) {
        console.warn("TTS returned tiny audio:", blob.size, "bytes, retrying...");
        // Retry once without emotion tags
        const cleanText = text.replace(/\[[^\]]+\]\s*/g, "").trim();
        if (cleanText) {
          const retry = await fetch("/api/voice/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleanText, referenceId: voiceId || undefined }),
          });
          if (retry.ok) {
            const retryBlob = await retry.blob();
            if (retryBlob.size >= 100) {
              const retryUrl = URL.createObjectURL(retryBlob);
              const retryAudio = new Audio(retryUrl);
              audioRef.current = retryAudio;
              const ri = setInterval(() => {
                if (retryAudio.paused || retryAudio.ended) { clearInterval(ri); return; }
                setVolume(0.3 + Math.random() * 0.5);
              }, 100);
              await new Promise<void>((resolve) => {
                retryAudio.onended = () => { clearInterval(ri); URL.revokeObjectURL(retryUrl); setVolume(0); resolve(); };
                retryAudio.onerror = () => { clearInterval(ri); setVolume(0); resolve(); };
                retryAudio.play().catch(() => { clearInterval(ri); setVolume(0); resolve(); });
              });
              if (activeRef.current) setOrbState("listening");
              return;
            }
          }
        }
        if (activeRef.current) setOrbState("listening");
        setVolume(0);
        return;
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      const interval = setInterval(() => {
        if (audio.paused || audio.ended) { clearInterval(interval); return; }
        setVolume(0.3 + Math.random() * 0.5);
      }, 100);

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          clearInterval(interval);
          URL.revokeObjectURL(url);
          setVolume(0);
          resolve();
        };
        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          clearInterval(interval);
          URL.revokeObjectURL(url);
          setVolume(0);
          resolve();
        };
        audio.play().catch((e) => {
          console.error("Audio play failed:", e);
          clearInterval(interval);
          setVolume(0);
          resolve();
        });
      });
    } catch (err) {
      console.error("TTS fetch error:", err);
      setVolume(0);
    }

    if (activeRef.current) {
      setOrbState("listening");
    }
  }, [voiceId]);

  const getAIResponse = useCallback(async (userText: string) => {
    processingRef.current = true;
    try {
      const res = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: transcriptRef.current.slice(0, -1), // exclude the just-added user message
          systemPrompt,
        }),
      });
      if (!res.ok) throw new Error("Chat failed");

      const data = await res.json();
      const reply = data.reply;

      if (reply && activeRef.current) {
        // Check for end call signal
        const shouldEnd = reply.includes("[END_CALL]");
        const cleanReply = reply.replace(/\[END_CALL\]/g, "").trim();

        addMessage("assistant", cleanReply);
        await speak(cleanReply);

        // Auto-end call after goodbye
        if (shouldEnd) {
          activeRef.current = false;
          recognitionRef.current?.stop();
          recognitionRef.current = null;
          setCallStatus("ended");
          setOrbState("idle");
          setVolume(0);
          // Trigger analysis
          const msgs = transcriptRef.current;
          if (msgs.length > 1) {
            setAnalyzing(true);
            fetch("/api/calls/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ transcript: msgs.map((t) => ({ role: t.role, content: t.text })) }),
            })
              .then((r) => r.json())
              .then((d) => { if (d.analysis) setAnalysis(d.analysis); })
              .catch(console.error)
              .finally(() => setAnalyzing(false));
          }
          return;
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
    }
    processingRef.current = false;
  }, [systemPrompt, addMessage, speak]);

  const listeningRef = useRef(false);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("Ваш браузер не поддерживает распознавание речи. Используйте Chrome.");
      setCallStatus("error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = async (event: any) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        if (text && !processingRef.current) {
          // Stop recognition while processing
          listeningRef.current = false;
          try { recognition.stop(); } catch {}

          addMessage("user", text);
          setOrbState("idle");
          setVolume(0.1);
          await getAIResponse(text);

          // Restart after AI response
          if (activeRef.current) {
            try {
              listeningRef.current = true;
              recognition.start();
            } catch {}
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setErrorMsg("Доступ к микрофону заблокирован. Разрешите в настройках браузера.");
        setCallStatus("error");
        return;
      }
      listeningRef.current = false;
    };

    recognition.onend = () => {
      listeningRef.current = false;
      if (activeRef.current && !processingRef.current) {
        setTimeout(() => {
          if (activeRef.current && !listeningRef.current) {
            try {
              listeningRef.current = true;
              recognition.start();
            } catch {}
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
    recognition.start();
  }, [addMessage, getAIResponse]);

  const handleStart = useCallback(async () => {
    setCallStatus("connecting");
    setTranscript([]);
    transcriptRef.current = [];
    setErrorMsg("");
    setAnalysis(null);
    setOrbState("idle");
    setVolume(0);
    activeRef.current = true;

    // Say greeting
    setCallStatus("active");
    addMessage("assistant", greeting || "Здравствуйте! Чем могу помочь?");
    await speak(greeting || "Здравствуйте! Чем могу помочь?");

    // Start listening
    startListening();
  }, [greeting, addMessage, speak, startListening]);

  const handleStop = useCallback(() => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setCallStatus("ended");
    setOrbState("idle");
    setVolume(0);

    // Analyze via Gemini
    const msgs = transcriptRef.current;
    if (msgs.length > 1) {
      setAnalyzing(true);
      fetch("/api/calls/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: msgs.map((t) => ({ role: t.role, content: t.text })),
        }),
      })
        .then((res) => res.json())
        .then((data) => { if (data.analysis) setAnalysis(data.analysis); })
        .catch(console.error)
        .finally(() => setAnalyzing(false));
    }
  }, []);

  const handleReset = useCallback(() => {
    setCallStatus("idle");
    setTranscript([]);
    transcriptRef.current = [];
    setElapsed(0);
    setErrorMsg("");
    setOrbState("idle");
    setVolume(0);
    setAnalysis(null);
    setAnalyzing(false);
  }, []);

  const statusText: Record<CallStatus, string> = {
    idle: "Нажмите чтобы начать разговор",
    connecting: "Подключение...",
    active: orbState === "speaking" ? "AI отвечает..." : "Говорите...",
    ended: "Разговор завершён",
    error: "Ошибка",
  };

  return (
    <div className="space-y-6">
      {/* Orb area */}
      <div className="relative flex flex-col items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800 py-10 px-4">
        {(callStatus === "active" || callStatus === "ended") && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-sm font-mono">{formatTime(elapsed)}</span>
          </div>
        )}

        <div className="mb-6">
          <Badge
            variant="outline"
            className={`border px-3 py-1 text-xs font-medium
              ${callStatus === "active" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : ""}
              ${callStatus === "connecting" ? "border-amber-500/40 bg-amber-500/10 text-amber-400 animate-pulse" : ""}
              ${callStatus === "idle" ? "border-zinc-700 bg-zinc-800 text-zinc-400" : ""}
              ${callStatus === "ended" ? "border-zinc-700 bg-zinc-800 text-zinc-400" : ""}
              ${callStatus === "error" ? "border-red-500/40 bg-red-500/10 text-red-400" : ""}
            `}
          >
            {callStatus === "active" && (
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {statusText[callStatus]}
          </Badge>
        </div>

        <VoiceOrb state={orbState} volume={volume} />

        <div className="mt-8 flex items-center gap-4">
          {callStatus === "idle" && (
            <Button
              onClick={handleStart}
              size="lg"
              className="h-14 w-14 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:scale-105"
            >
              <Mic className="h-6 w-6" />
            </Button>
          )}
          {callStatus === "connecting" && (
            <Button disabled size="lg" className="h-14 w-14 rounded-full bg-amber-600/50 text-white cursor-wait">
              <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </Button>
          )}
          {callStatus === "active" && (
            <Button
              onClick={handleStop}
              size="lg"
              className="h-14 w-14 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/25 transition-all hover:shadow-red-500/40 hover:scale-105"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          )}
          {(callStatus === "ended" || callStatus === "error") && (
            <Button
              onClick={handleReset}
              size="lg"
              className="h-14 px-6 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25"
            >
              <Phone className="h-5 w-5 mr-2" />
              Начать заново
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {callStatus === "error" && errorMsg && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Ошибка</p>
            <p className="text-sm text-red-300/80 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Transcript */}
      {transcript.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <Bot className="h-4 w-4 text-indigo-400" />
            Транскрипт разговора
          </h4>
          <div className="max-h-[320px] overflow-y-auto space-y-3 pr-2">
            {transcript.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                  msg.role === "assistant"
                    ? "bg-indigo-600/20 border border-indigo-500/20 text-zinc-200"
                    : "bg-zinc-800 border border-zinc-700 text-zinc-300"
                }`}>
                  <p className="text-xs font-medium mb-1">
                    {msg.role === "assistant" ? (
                      <span className="text-indigo-400 flex items-center gap-1">
                        <Bot className="h-3 w-3" /> VOXI
                      </span>
                    ) : (
                      <span className="text-zinc-500">Вы</span>
                    )}
                  </p>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className="text-[10px] text-zinc-600 mt-1 text-right">
                    {formatTime(Math.floor(msg.timestamp / 1000))}
                  </p>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      {/* Analysis */}
      {analyzing && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-indigo-400">
            <div className="h-4 w-4 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
            Анализ разговора через Gemini AI...
          </div>
        </div>
      )}

      {analysis && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-indigo-400" />
            Результат анализа (Gemini AI)
          </h4>
          <p className="text-sm text-zinc-300 leading-relaxed">{analysis.summary}</p>
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-bold ${
              analysis.qualificationScore >= 80 ? "text-green-400" :
              analysis.qualificationScore >= 50 ? "text-yellow-400" :
              analysis.qualificationScore >= 20 ? "text-orange-400" : "text-red-400"
            }`}>
              {analysis.qualificationScore}/100
            </div>
            <div className="text-xs text-zinc-500">
              {analysis.qualificationScore >= 80 ? "Горячий лид" :
               analysis.qualificationScore >= 50 ? "Тёплый лид" :
               analysis.qualificationScore >= 20 ? "Холодный лид" : "Не квалифицирован"}
            </div>
            <div className={`ml-auto text-xs px-2 py-1 rounded-full ${
              analysis.sentiment === "POSITIVE" ? "bg-green-500/10 text-green-400" :
              analysis.sentiment === "NEGATIVE" ? "bg-red-500/10 text-red-400" :
              "bg-yellow-500/10 text-yellow-400"
            }`}>
              {analysis.sentiment === "POSITIVE" ? "Позитивный" :
               analysis.sentiment === "NEGATIVE" ? "Негативный" : "Нейтральный"}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {analysis.clientName && (
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Имя</p>
                <p className="text-sm text-zinc-200">{analysis.clientName}</p>
              </div>
            )}
            {analysis.budget && (
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Бюджет</p>
                <p className="text-sm text-zinc-200">{analysis.budget}</p>
              </div>
            )}
            {analysis.interest && (
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Интерес</p>
                <p className="text-sm text-zinc-200">{analysis.interest}</p>
              </div>
            )}
            {analysis.timeline && (
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Сроки</p>
                <p className="text-sm text-zinc-200">{analysis.timeline}</p>
              </div>
            )}
            {analysis.nextStep && (
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Следующий шаг</p>
                <p className="text-sm text-zinc-200">{analysis.nextStep}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hint */}
      {callStatus === "idle" && transcript.length === 0 && !analysis && (
        <div className="text-center text-sm text-zinc-500 space-y-1">
          <p>Нажмите кнопку, чтобы начать разговор с AI-ассистентом.</p>
          <p className="text-zinc-600">
            Голос: Fish Audio · Мозги: Gemini · STT: Web Speech API · Телефонные минуты не расходуются.
          </p>
        </div>
      )}
    </div>
  );
}
