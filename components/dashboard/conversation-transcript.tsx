"use client";

import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscriptItem {
  message: string | null;
  role: 'agent' | 'user';
  time_in_call_secs: number;
  tool_calls?: unknown[];
  tool_results?: unknown[];
  llm_usage?: {
    model_usage?: Record<string, unknown>;
  };
  conversation_turn_metrics?: {
    metrics?: Record<string, { elapsed_time: number }>;
  };
}

interface ConversationTranscriptProps {
  transcript: TranscriptItem[];
  className?: string;
}

export function ConversationTranscript({ transcript, className }: ConversationTranscriptProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLLMTime = (metrics?: Record<string, { elapsed_time: number }>) => {
    if (!metrics) return null;
    
    const ttfb = metrics['convai_llm_service_ttfb']?.elapsed_time;
    if (ttfb) {
      return Math.round(ttfb * 1000); // Convert to ms
    }
    return null;
  };

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {transcript.map((item, index) => (
        <div
          key={index}
          className={cn(
            "flex gap-3 p-3 rounded-lg",
            item.role === 'agent' 
              ? "bg-muted/50 ml-0 mr-8" 
              : "bg-primary/10 ml-8 mr-0"
          )}
        >
          <div className="flex-shrink-0">
            {item.role === 'agent' ? (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-4 h-4 text-secondary-foreground" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">
                {item.role === 'agent' ? 'Agent' : 'User'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(item.time_in_call_secs)}
              </span>
            </div>
            
            {item.message && (
              <div className="text-sm leading-relaxed mb-2">
                {item.message}
              </div>
            )}
            
            {item.role === 'agent' && item.conversation_turn_metrics && (
              <div className="flex items-center gap-2">
                {formatLLMTime(item.conversation_turn_metrics.metrics) && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    LLM {formatLLMTime(item.conversation_turn_metrics.metrics)} ms
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {transcript.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Транскрипция недоступна
        </div>
      )}
    </div>
  );
} 