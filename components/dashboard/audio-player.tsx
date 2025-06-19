"use client";

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, RotateCcw, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
}

export function AudioPlayer({ audioUrl, className }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !token) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    // Загружаем аудио с авторизацией
    const loadAudio = async () => {
      try {
        const response = await fetch(audioUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          audio.src = url;
        }
      } catch (error) {
        console.error('Error loading audio:', error);
        setIsLoading(false);
      }
    };

    loadAudio();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl, token]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(audioUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Ошибка загрузки аудио');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conversation.mp3';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading audio:', error);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn(
      "flex flex-col gap-2 p-3 border rounded-lg bg-background transition-all duration-300",
      "hover:shadow-md hover:border-primary/20",
      isLoading && "animate-pulse",
      className
    )}>
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="use-credentials"
      />
      
      {/* Waveform visualization */}
      <div className="relative">
        <div 
          className={cn(
            "h-12 bg-muted rounded cursor-pointer overflow-hidden transition-all duration-200",
            isLoading ? "animate-pulse" : "hover:bg-muted/80"
          )}
          onClick={handleSeek}
        >
          {isLoading ? (
            /* Loading animation */
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: '16px',
                      animationDelay: `${i * 100}ms`,
                      animationDuration: '1s',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Static waveform bars */
            <div className="flex items-center justify-center h-full gap-0.5 px-2">
              {Array.from({ length: 80 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "transition-all duration-300 ease-in-out rounded-full transform",
                    i < (progress * 80) / 100 
                      ? "bg-primary scale-110 shadow-sm" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50 hover:scale-105"
                  )}
                  style={{
                    width: '2px',
                    height: `${8 + Math.random() * 16}px`,
                    transitionDelay: `${i * 2}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Playing indicator */}
        {isPlaying && !isLoading && (
          <div className="absolute top-1 right-1">
            <div className="flex gap-0.5">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-primary rounded-full animate-bounce"
                  style={{
                    height: '8px',
                    animationDelay: `${i * 150}ms`,
                    animationDuration: '0.8s',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(-10)}
          disabled={isLoading}
          className="h-6 w-6 transition-all duration-200 hover:scale-110 hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-3 w-3 transition-transform duration-200" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlayPause}
          disabled={isLoading}
          className={cn(
            "h-8 w-8 transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
            isPlaying ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted/80"
          )}
        >
          <div className="relative">
            {isPlaying ? (
              <Pause className="h-4 w-4 transition-all duration-200 animate-in fade-in-0 zoom-in-95" />
            ) : (
              <Play className="h-4 w-4 transition-all duration-200 animate-in fade-in-0 zoom-in-95" />
            )}
          </div>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(10)}
          disabled={isLoading}
          className="h-6 w-6 transition-all duration-200 hover:scale-110 hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCw className="h-3 w-3 transition-transform duration-200" />
        </Button>

        <div className="flex-1 text-center text-xs text-muted-foreground transition-colors duration-200">
          <span className="tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          className="h-6 w-6 transition-all duration-200 hover:scale-110 hover:bg-muted/80"
        >
          <Download className="h-3 w-3 transition-transform duration-200 hover:rotate-12" />
        </Button>
      </div>
    </div>
  );
} 