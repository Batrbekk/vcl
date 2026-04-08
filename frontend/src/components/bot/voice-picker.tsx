"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Play, Square, Heart, Check, Loader2, Volume2, ChevronDown } from "lucide-react";

interface Voice {
  id: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  likes: number;
  uses: number;
  hasCover: boolean;
}

interface VoicePickerProps {
  selectedId: string;
  selectedDisplayName?: string;
  onSelect: (id: string, name: string) => void;
}

export function VoicePicker({ selectedId, selectedDisplayName, onSelect }: VoicePickerProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open && voices.length === 0) fetchVoices();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchVoices(search), 400);
    return () => clearTimeout(timer);
  }, [search, open]);

  async function fetchVoices(query = "") {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        language: "ru",
        page_size: "30",
        sort_by: "task_count",
        ...(query ? { search: query } : {}),
      });
      const res = await fetch(`/api/voice/voices?${params}`);
      const data = await res.json();
      setVoices(data.voices || []);
    } catch (err) {
      console.error("Failed to fetch voices:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(voice: Voice) {
    onSelect(voice.id, voice.name);
    setSelectedName(voice.name);
    setOpen(false);
    // Stop audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
    }
  }

  async function handlePreview(e: React.MouseEvent, voice: Voice) {
    e.stopPropagation();

    if (playingId === voice.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
    }

    setLoadingPreview(voice.id);
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Здравствуйте! Я ваш виртуальный ассистент. [short pause] Чем могу вам помочь сегодня?",
          referenceId: voice.id,
        }),
      });

      if (!res.ok) { setLoadingPreview(null); return; }

      const arrayBuffer = await res.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "audio/ogg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio();
      audioRef.current = audio;
      audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingId(null); setLoadingPreview(null); URL.revokeObjectURL(url); };
      audio.src = url;
      setPlayingId(voice.id);
      setLoadingPreview(null);
      await audio.play();
    } catch {
      setPlayingId(null);
      setLoadingPreview(null);
    }
  }

  function formatUses(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  const displayName = selectedName || selectedDisplayName || "";

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        suppressHydrationWarning
        className="flex w-full items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-3 text-left transition-colors hover:border-zinc-600 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:outline-none"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-700">
          <Volume2 className="h-4 w-4 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200 truncate">{displayName || "Выберите голос..."}</p>
          <p className="text-[11px] text-zinc-500">Нажмите для выбора голоса</p>
        </div>
        <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
      </button>

      {/* Modal with voice list */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!max-w-4xl w-full p-0 gap-0 bg-zinc-900 border-zinc-800 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-white text-lg">Выберите голос</DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Нажмите ▶ для прослушивания голоса.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Поиск голоса..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                autoFocus
              />
            </div>
          </div>

          {/* Voice list */}
          <ScrollArea className="h-[calc(100vh-14rem)] border-t border-zinc-800">
            <div className="p-2 space-y-0.5">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Загрузка...
                </div>
              ) : voices.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
                  Голоса не найдены
                </div>
              ) : (
                voices.map((voice) => (
                  <div
                    key={voice.id}
                    onClick={() => handleSelect(voice)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors ${
                      selectedId === voice.id
                        ? "bg-indigo-600/10 ring-1 ring-indigo-500/30"
                        : "hover:bg-zinc-800"
                    }`}
                  >
                    {/* Avatar with play */}
                    <div className="relative shrink-0 group">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 overflow-hidden">
                        {voice.hasCover ? (
                          <img
                            src={`/api/voice/cover/${voice.id}`}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = "none";
                              el.parentElement!.innerHTML = `<span class="text-sm font-medium text-zinc-300">${voice.name.charAt(0).toUpperCase()}</span>`;
                            }}
                          />
                        ) : (
                          <span className="text-sm font-medium text-zinc-300">
                            {voice.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handlePreview(e, voice)}
                        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {loadingPreview === voice.id ? (
                          <Loader2 className="h-4 w-4 text-white animate-spin" />
                        ) : playingId === voice.id ? (
                          <Square className="h-3 w-3 text-white fill-white" />
                        ) : (
                          <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium text-zinc-200 truncate">{voice.name}</span>
                        <span className="text-xs text-zinc-500 shrink-0">· {voice.author}</span>
                        {selectedId === voice.id && <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                      </div>
                      {voice.description && (
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{voice.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
                        {voice.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="h-[18px] px-1.5 text-[10px] border-zinc-700 text-zinc-400 rounded-md shrink-0">
                            {tag}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-zinc-600 ml-auto shrink-0 flex items-center gap-1">
                          <Heart className="h-2.5 w-2.5" /> {voice.likes}
                          <span className="mx-0.5">·</span>
                          {formatUses(voice.uses)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
