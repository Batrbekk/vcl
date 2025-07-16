"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Loader2, Copy, Check, FileText, LetterText, Globe } from "lucide-react"
import { toast } from "sonner"
import { useKnowledge, DependentAgent } from "@/store/use-knowledge"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface KnowledgeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dependentAgents?: DependentAgent[];
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'text':
      return <LetterText className="h-4 w-4" />
    case 'file':
      return <FileText className="h-4 w-4" />
    case 'url':
      return <Globe className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}



const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function KnowledgeSheet({ 
  isOpen,
  onClose,
  dependentAgents,
}: KnowledgeSheetProps) {
  const { currentDocument, isLoading } = useKnowledge();
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const copyDocumentId = async () => {
    if (!currentDocument?.id) return;
    
    try {
      await navigator.clipboard.writeText(currentDocument.id);
      setCopied(true);
      toast.success("ID документа скопирован");
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
        ) : !currentDocument ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Не удалось загрузить данные документа
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(currentDocument.type)}
                    <SheetTitle className="text-lg max-w-1/2 truncate">
                      {currentDocument.name}
                    </SheetTitle>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6">
              {/* Метаданные */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium mb-1">ID документа</h4>
                  <button
                    onClick={copyDocumentId}
                    className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs font-medium hover:bg-muted/80 transition-colors cursor-pointer"
                    title="Нажмите, чтобы скопировать ID"
                  >
                    <code>{currentDocument.id}</code>
                    {copied ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Последнее обновление</h4>
                  <p className="text-sm text-muted-foreground">
                    {currentDocument.metadata?.last_updated_at_unix_secs ? 
                      format(new Date(currentDocument.metadata.last_updated_at_unix_secs * 1000), "d MMM y 'г.', HH:mm", {
                        locale: ru,
                      }) : 'Дата недоступна'
                    }
                  </p>
                </div>
              </div>

              {/* Размер */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-2">Размер</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{currentDocument.metadata?.size_bytes ? formatFileSize(currentDocument.metadata.size_bytes) : 'Размер недоступен'}</span>
                </div>
              </div>

              {/* Dependent agents */}
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-2">Зависимые агенты</h4>
                {dependentAgents && dependentAgents.length > 0 ? (
                  <div className="space-y-2">
                    {dependentAgents.map((agent: DependentAgent) => (
                      <div key={agent.id} className="text-sm text-muted-foreground">
                        <button
                          onClick={() => router.push(`/dashboard/agents/detail/${agent.id}`)}
                          className="text-primary hover:text-primary/80 underline cursor-pointer"
                        >
                          {agent.name}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Не используется ни одним агентом
                  </p>
                )}
              </div>

              {/* URL Content или extracted content */}
              {(currentDocument.type === 'url' || currentDocument.extracted_inner_html) && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-2">
                    {currentDocument.type === 'url' ? 'Содержимое URL' : 'Содержимое'}
                  </h4>
                  <div className="h-[400px] overflow-y-auto p-4 bg-muted/30 rounded-lg text-sm">
                    {currentDocument.extracted_inner_html ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: currentDocument.extracted_inner_html 
                        }} 
                        className="prose prose-sm max-w-none"
                      />
                    ) : currentDocument.url ? (
                      <p className="text-muted-foreground">
                        URL: <a href={currentDocument.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {currentDocument.url}
                        </a>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Содержимое недоступно</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
} 