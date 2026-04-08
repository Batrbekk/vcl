"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioPlayer } from "@/components/ui/audio-player";
import type { DemoCall } from "@/data/demo-calls";

interface CallTranscriptDialogProps {
  call: DemoCall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

export function CallTranscriptDialog({
  call,
  open,
  onOpenChange,
}: CallTranscriptDialogProps) {
  if (!call) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {call.leadName}
            <Badge
              className={
                call.direction === "outbound"
                  ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                  : "bg-green-500/20 text-green-400 border-green-500/30"
              }
            >
              {call.direction === "outbound" ? "Исходящий" : "Входящий"}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {formatDate(call.startedAt)}
          </DialogDescription>
        </DialogHeader>

        {/* Audio Recording */}
        {call.recordingUrl && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Запись разговора
            </h4>
            <AudioPlayer src={call.recordingUrl} />
          </div>
        )}

        <ScrollArea className="max-h-[calc(85vh-120px)] pr-2">
          <div className="space-y-5">
            {/* Summary */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
                Резюме звонка
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {call.summary}
              </p>
            </div>

            {/* Qualification */}
            {call.qualification.score > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
                  Квалификация
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-zinc-500">Бюджет</span>
                    <p className="text-sm text-zinc-200 mt-0.5">
                      {call.qualification.budget || "---"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Сроки</span>
                    <p className="text-sm text-zinc-200 mt-0.5">
                      {call.qualification.timeline || "---"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-zinc-500">Потребность</span>
                    <p className="text-sm text-zinc-200 mt-0.5">
                      {call.qualification.need || "---"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500">Оценка</span>
                    <p
                      className={`text-lg font-bold mt-0.5 ${getScoreColor(
                        call.qualification.score
                      )}`}
                    >
                      {call.qualification.score}/100
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript */}
            {call.transcript.length > 0 && (
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
                  Транскрипт
                </h4>
                <div className="space-y-3">
                  {call.transcript.map((entry, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        entry.role === "assistant"
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${
                          entry.role === "assistant"
                            ? "bg-indigo-500/15 border border-indigo-500/20"
                            : "bg-zinc-800 border border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wider ${
                              entry.role === "assistant"
                                ? "text-indigo-400"
                                : "text-zinc-400"
                            }`}
                          >
                            {entry.role === "assistant" ? "VOXI" : "Клиент"}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-200 leading-relaxed">
                          {entry.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {call.transcript.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Транскрипт недоступен для данного звонка
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
