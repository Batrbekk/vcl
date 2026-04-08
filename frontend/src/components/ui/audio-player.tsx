"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  className?: string;
  compact?: boolean;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function AudioPlayer({ src, className = "", compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.src = "";
    };
  }, [src]);

  const togglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const newTime = ratio * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-md bg-zinc-800 px-2 py-1 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={togglePlay}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3 ml-0.5" />
          )}
        </button>
        <div
          ref={progressRef}
          className="h-1.5 w-16 cursor-pointer rounded-full bg-zinc-700"
          onClick={seekTo}
        >
          <div
            className="h-1.5 rounded-full bg-indigo-500 transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-zinc-400 min-w-[32px]">
          {formatTime(currentTime)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      <div className="flex flex-1 items-center gap-3 min-w-0">
        <span className="text-xs font-mono text-zinc-400 min-w-[36px]">
          {formatTime(currentTime)}
        </span>

        <div
          ref={progressRef}
          className="h-2 flex-1 cursor-pointer rounded-full bg-zinc-700"
          onClick={seekTo}
        >
          <div
            className="h-2 rounded-full bg-indigo-500 transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-xs font-mono text-zinc-400 min-w-[36px]">
          {formatTime(duration)}
        </span>
      </div>

      <Volume2 className="h-4 w-4 text-zinc-500 shrink-0" />
    </div>
  );
}
