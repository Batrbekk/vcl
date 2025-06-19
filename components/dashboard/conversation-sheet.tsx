"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Loader2, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useConversations } from "@/store/use-conversations"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AudioPlayer } from "./audio-player"
import { ConversationTranscript } from "./conversation-transcript"

interface ConversationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusMap: Record<string, { label: string; className: string }> = {
  'success': {
    label: 'Успешно',
    className: 'bg-green-100 text-green-700'
  },
  'failed': {
    label: 'Ошибка',
    className: 'bg-red-100 text-red-700'
  },
  'failure': {
    label: 'Ошибка',
    className: 'bg-red-100 text-red-700'
  },
  'processing': {
    label: 'В процессе',
    className: 'bg-blue-100 text-blue-700'
  },
  'unknown': {
    label: 'Не ответили',
    className: 'bg-gray-100 text-gray-700'
  },
  'initiated': {
    label: 'Не ответили',
    className: 'bg-gray-100 text-gray-700'
  }
};

export function ConversationSheet({ 
  isOpen,
  onClose,
}: ConversationSheetProps) {
  const { currentConversation, isLoading } = useConversations();
  const [activeTab, setActiveTab] = useState("transcript");
  const [copied, setCopied] = useState(false);

  const copyConversationId = async () => {
    if (!currentConversation?.conversation_id) return;
    
    try {
      await navigator.clipboard.writeText(currentConversation.conversation_id);
      setCopied(true);
      toast.success("ID разговора скопирован");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать ID");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={() => {
      onClose();
    }}>
      <SheetContent className="w-1/2 !max-w-full px-4" onOpenAutoFocus={(e) => {
        e.preventDefault();
      }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !currentConversation ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Не удалось загрузить данные разговора
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SheetTitle className="text-xl">
                    Разговор с {currentConversation.agent_name}
                  </SheetTitle>
                  <button
                    onClick={copyConversationId}
                    className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs font-medium hover:bg-muted/80 transition-colors cursor-pointer"
                    title="Нажмите, чтобы скопировать ID"
                  >
                    <code>{currentConversation.conversation_id}</code>
                    {copied ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </SheetHeader>

            {/* Аудио плеер */}
            {currentConversation.audio_url && (
              <div className="mt-4 mb-4">
                <AudioPlayer audioUrl={currentConversation.audio_url} />
              </div>
            )}

            <div className="mt-2">
              {/* Метаданные */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium mb-1">Дата</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(currentConversation.start_time_unix_secs * 1000), "d MMM y 'г.', HH:mm", {
                      locale: ru,
                    })}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Длительность</h4>
                  <p className="text-sm text-muted-foreground">{currentConversation.call_duration_secs}с</p>
                </div>
              </div>

              {/* Статус */}
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-medium">Статус звонка</h4>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  statusMap[currentConversation.call_successful]?.className || "bg-gray-100 text-gray-700"
                )}>
                  {statusMap[currentConversation.call_successful]?.label || currentConversation.call_successful}
                </span>
              </div>

              {/* Табы с транскрипцией и итогами */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="transcript" className="cursor-pointer">Транскрипция</TabsTrigger>
                  <TabsTrigger value="summary" className="cursor-pointer">Резюме</TabsTrigger>
                </TabsList>
                <TabsContent value="transcript" className="mt-4">
                  <div className="h-[400px] overflow-y-auto">
                    <ConversationTranscript 
                      transcript={currentConversation.transcription || []}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="summary" className="mt-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Краткое содержание</h4>
                      <p className="text-sm text-muted-foreground">
                        {currentConversation.analysis?.transcript_summary || 'Итоги разговора недоступны'}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
} 