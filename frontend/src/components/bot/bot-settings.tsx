"use client";

import { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Bot, Save, Mic, Activity, Settings, FlaskConical,
  Sparkles, Clock, PhoneCall, TrendingUp, CheckCircle,
  Copy, Zap, Volume2, AlertCircle, PhoneOutgoing,
} from "lucide-react";
import { VoiceChat } from "@/components/bot/voice-chat";
import { PhoneCallPanel } from "@/components/bot/phone-call";
import { VoicePicker } from "@/components/bot/voice-picker";
import { organizationData, callsData } from "@/data/seed";

const { botConfig, subscription, vapiAssistantId: demoVapiAssistantId } = organizationData;

const completedCalls = callsData.filter((c) => c.status === "completed");
const totalCalls = callsData.length;
const avgDuration = Math.round(
  completedCalls.reduce((sum, c) => sum + c.duration, 0) / (completedCalls.length || 1)
);
const successRate = Math.round((completedCalls.length / totalCalls) * 100);

interface BotSettingsProps {
  botId?: string;
  defaultTab?: number;
}

export function BotSettings({ botId, defaultTab = 0 }: BotSettingsProps = {}) {
  const [botName, setBotName] = useState(botConfig.name);
  const [greeting, setGreeting] = useState(botConfig.greeting);
  const [prompt, setPrompt] = useState(botConfig.prompt);
  const [voiceId, setVoiceId] = useState("");
  const [voiceDisplayName, setVoiceDisplayName] = useState("Не выбран");
  const [maxRetries, setMaxRetries] = useState(botConfig.maxRetries);
  const [retryInterval, setRetryInterval] = useState(botConfig.retryInterval);
  const [vapiAssistantId, setVapiAssistantId] = useState(demoVapiAssistantId || "");
  const [botActive, setBotActive] = useState(true);

  // Voice settings (Fish Audio)
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [voiceTemperature, setVoiceTemperature] = useState(0.7);
  const [voiceTopP, setVoiceTopP] = useState(0.7);
  const [voiceModel, setVoiceModel] = useState("s2-pro");
  const [voiceNormalize, setVoiceNormalize] = useState(true);
  const [voiceLoudnessNorm, setVoiceLoudnessNorm] = useState(true);

  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load initial values from API (real DB), fallback to demo data on error
  useEffect(() => {
    const url = botId ? `/api/bots/${botId}` : "/api/bot";
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => {
        const d = data.bot || data; // /api/bots/[id] returns { bot }, /api/bot returns flat
        if (d.name || d.botName) setBotName(d.name || d.botName);
        if (d.greeting || d.botGreeting) setGreeting(d.greeting || d.botGreeting);
        if (d.prompt || d.botPrompt) setPrompt(d.prompt || d.botPrompt);
        if (d.voiceId || d.botVoice) setVoiceId(d.voiceId || d.botVoice || "");
        if (d.voiceName) setVoiceDisplayName(d.voiceName);
        if (d.maxRetries !== undefined || d.botMaxRetries !== undefined) setMaxRetries(d.maxRetries ?? d.botMaxRetries);
        if (d.retryInterval !== undefined || d.botRetryInterval !== undefined) setRetryInterval(d.retryInterval ?? d.botRetryInterval);
        if (d.vapiAssistantId) setVapiAssistantId(d.vapiAssistantId);
        if (d.isActive !== undefined) setBotActive(d.isActive);
        // Voice settings
        if (d.voiceSpeed !== undefined) setVoiceSpeed(d.voiceSpeed);
        if (d.voiceVolume !== undefined) setVoiceVolume(d.voiceVolume);
        if (d.voiceTemperature !== undefined) setVoiceTemperature(d.voiceTemperature);
        if (d.voiceTopP !== undefined) setVoiceTopP(d.voiceTopP);
        if (d.voiceModel !== undefined) setVoiceModel(d.voiceModel);
        if (d.voiceNormalize !== undefined) setVoiceNormalize(d.voiceNormalize);
        if (d.voiceLoudnessNorm !== undefined) setVoiceLoudnessNorm(d.voiceLoudnessNorm);
      })
      .catch(() => {});
  }, [botId]);

  async function handleSave() {
    setSaveError(null);
    try {
      const url = botId ? `/api/bots/${botId}` : "/api/bot";
      const voiceSettings = { voiceSpeed, voiceVolume, voiceTemperature, voiceTopP, voiceModel, voiceNormalize, voiceLoudnessNorm };
      const body = botId
        ? { name: botName, greeting, prompt, voiceId, voiceName: voiceDisplayName, maxRetries, retryInterval, ...voiceSettings }
        : { botName, botGreeting: greeting, botPrompt: prompt, botVoice: voiceId, botMaxRetries: maxRetries, botRetryInterval: retryInterval };

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка сервера (${res.status})`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить";
      setSaveError(message);
      setTimeout(() => setSaveError(null), 5000);
    }
  }

  function handleCopyId() {
    navigator.clipboard.writeText(vapiAssistantId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const minutesPercent = Math.round(
    (subscription.minutesUsed / subscription.minutesLimit) * 100
  );

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="h-9 bg-zinc-900 border border-zinc-800">
        <TabsTrigger value={0} className="text-zinc-400 data-active:text-white data-active:bg-zinc-800">
          <Settings className="h-4 w-4" />
          Основные настройки
        </TabsTrigger>
        <TabsTrigger value={1} className="text-zinc-400 data-active:text-white data-active:bg-zinc-800">
          <Activity className="h-4 w-4" />
          Статус и использование
        </TabsTrigger>
        <TabsTrigger value={2} className="text-zinc-400 data-active:text-white data-active:bg-zinc-800">
          <FlaskConical className="h-4 w-4" />
          Тестирование
        </TabsTrigger>
        <TabsTrigger value={3} className="text-zinc-400 data-active:text-white data-active:bg-zinc-800">
          <PhoneOutgoing className="h-4 w-4" />
          Звонок
        </TabsTrigger>
      </TabsList>

      {/* ═══ Tab 1: Основные настройки ═══ */}
      <TabsContent value={0} className="mt-4 space-y-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bot className="h-5 w-5 text-indigo-400" />
              Настройки AI-бота
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Настройте поведение, голос и скрипты вашего AI-ассистента
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bot name */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Имя бота</Label>
              <Input
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Например: Алия"
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
              />
              <p className="text-xs text-zinc-500">
                Имя, которым бот будет представляться при звонке
              </p>
            </div>

            {/* Greeting */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Приветственное сообщение</Label>
              <Textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="Здравствуйте! Компания..."
                rows={3}
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
              />
              <p className="text-xs text-zinc-500">
                Можно использовать теги эмоций: [short pause] [excited] [low voice] [clearing throat]
              </p>
            </div>

            {/* System prompt */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Системный промпт</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ты AI-ассистент компании..."
                rows={8}
                className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-zinc-500">
                Определяет поведение, тон и задачи бота. Это главная инструкция для AI.
              </p>
            </div>

            {/* Voice picker */}
            <div className="space-y-2">
              <Label className="text-zinc-300 flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-indigo-400" />
                Голос (Fish Audio)
              </Label>
              <VoicePicker
                selectedId={voiceId}
                selectedDisplayName={voiceDisplayName}
                onSelect={(id, name) => {
                  setVoiceId(id);
                  setVoiceDisplayName(name);
                }}
              />
              <p className="text-xs text-zinc-500">
                Выберите голос и нажмите ▶ для прослушивания. Голоса от Fish Audio с поддержкой эмоций.
              </p>
            </div>

            {/* Voice settings */}
            <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-800/30 p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-400" />
                <Label className="text-zinc-200 font-medium">Настройки голоса</Label>
              </div>

              {/* TTS Model */}
              <div className="space-y-2">
                <Label className="text-zinc-300 text-sm">Модель TTS</Label>
                <select
                  value={voiceModel}
                  onChange={(e) => setVoiceModel(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                >
                  <option value="s2-pro">S2 Pro (рекомендуется)</option>
                  <option value="s1">S1 (быстрый)</option>
                </select>
              </div>

              {/* Speed + Volume row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-zinc-300 text-sm">Скорость</Label>
                  <Input
                    type="number"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(Number(e.target.value))}
                    className="border-zinc-700 bg-zinc-800 text-white focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                  />
                  <p className="text-xs text-zinc-500">0.5 — медленно, 2.0 — быстро</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300 text-sm">Объём (dB)</Label>
                  <Input
                    type="number"
                    min={-20}
                    max={20}
                    step={1}
                    value={voiceVolume}
                    onChange={(e) => setVoiceVolume(Number(e.target.value))}
                    className="border-zinc-700 bg-zinc-800 text-white focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                  />
                  <p className="text-xs text-zinc-500">Корректировка объёма, от -20 до +20 dB</p>
                </div>
              </div>

              {/* Switches row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3">
                  <div>
                    <p className="text-sm text-zinc-300">Нормализация текста</p>
                    <p className="text-xs text-zinc-500">Числа, даты, аббревиатуры</p>
                  </div>
                  <Switch
                    checked={voiceNormalize}
                    onCheckedChange={(val: boolean) => setVoiceNormalize(val)}
                    className="data-checked:bg-indigo-600"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3">
                  <div>
                    <p className="text-sm text-zinc-300">Нормализация громкости</p>
                    <p className="text-xs text-zinc-500">Выравнивание уровня звука</p>
                  </div>
                  <Switch
                    checked={voiceLoudnessNorm}
                    onCheckedChange={(val: boolean) => setVoiceLoudnessNorm(val)}
                    className="data-checked:bg-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Retry settings */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-zinc-300">Макс. повторных звонков</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                  className="border-zinc-700 bg-zinc-800 text-white focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Интервал (минуты)</Label>
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={retryInterval}
                  onChange={(e) => setRetryInterval(Number(e.target.value))}
                  className="border-zinc-700 bg-zinc-800 text-white focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} size="lg" className="bg-indigo-600 text-white hover:bg-indigo-700">
                <Save className="h-4 w-4 mr-1.5" />
                Сохранить настройки
              </Button>
              {saved && !saveError && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  Сохранено
                </span>
              )}
              {saveError && (
                <span className="flex items-center gap-1.5 text-sm text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  Сохранено локально (БД недоступна)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ═══ Tab 2: Статус и использование ═══ */}
      <TabsContent value={1} className="mt-4 space-y-4">
        {/* Bot status */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-indigo-400" />
              Статус бота
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  botActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-zinc-600"
                }`} />
                <div>
                  <p className="text-sm font-medium text-white">{botActive ? "Бот активен" : "Бот отключён"}</p>
                  <p className="text-xs text-zinc-500">
                    {botActive ? "AI-ассистент принимает и совершает звонки" : "Все звонки приостановлены"}
                  </p>
                </div>
              </div>
              <Switch checked={botActive} onCheckedChange={(val: boolean) => setBotActive(val)} className="data-checked:bg-indigo-600" />
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Clock className="h-5 w-5 text-indigo-400" />
              Использование
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{subscription.minutesUsed}</p>
                <p className="text-sm text-zinc-400">из {subscription.minutesLimit} минут</p>
              </div>
              <p className="text-2xl font-bold text-indigo-400">{minutesPercent}%</p>
            </div>
            <div className="h-3 w-full rounded-full bg-zinc-800">
              <div className="h-3 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all" style={{ width: `${minutesPercent}%` }} />
            </div>

            {/* Stack info */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4 space-y-2">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Технологический стек</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> STT: Web Speech API
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> LLM: Groq (Llama 3.3 70B)
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" /> TTS: Fish Audio (S2 Pro)
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Телефония: VAPI + Telnyx
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats + IDs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-zinc-400">Тариф</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-sm px-3 py-1 h-auto">
                <Sparkles className="h-3.5 w-3.5" />
                PREMIUM
              </Badge>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-zinc-400">VAPI Assistant ID</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-300 truncate">
                  {vapiAssistantId || "Не настроен"}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyId} className="shrink-0 border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white">
                  {copied ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call stats */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              Статистика
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 text-center">
                <PhoneCall className="mx-auto h-6 w-6 text-indigo-400 mb-2" />
                <p className="text-2xl font-bold text-white">{totalCalls}</p>
                <p className="text-xs text-zinc-500 mt-1">Всего звонков</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 text-center">
                <Clock className="mx-auto h-6 w-6 text-indigo-400 mb-2" />
                <p className="text-2xl font-bold text-white">
                  {Math.floor(avgDuration / 60)}:{String(avgDuration % 60).padStart(2, "0")}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Средняя длительность</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 text-center">
                <CheckCircle className="mx-auto h-6 w-6 text-emerald-400 mb-2" />
                <p className="text-2xl font-bold text-white">{successRate}%</p>
                <p className="text-xs text-zinc-500 mt-1">Успешные звонки</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ═══ Tab 3: Тестирование ═══ */}
      <TabsContent value={2} className="mt-4">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mic className="h-5 w-5 text-indigo-400" />
              Тестирование голосового ассистента
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Поговорите с AI-ассистентом прямо в браузере. Используется Groq + Fish Audio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoiceChat
              systemPrompt={prompt}
              greeting={greeting}
              voiceId={voiceId}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* ═══ Tab 4: Звонок ═══ */}
      <TabsContent value={3} className="mt-4">
        <PhoneCallPanel />
      </TabsContent>
    </Tabs>
  );
}
