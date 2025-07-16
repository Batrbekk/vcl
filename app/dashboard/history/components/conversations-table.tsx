"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useConversations } from "@/store/use-conversations";
import { useUserStore } from "@/store/user-store";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ConversationsTableProps {
  conversations: Array<{
    conversation_id: string;
    start_time_unix_secs: number;
    call_duration_secs: number;
    status: string;
    agent_name: string;
  }>;
  onRowClick: (id: string) => void;
}

const statusMap: Record<string, { label: string; className: string }> = {
  'done': {
    label: 'Завершен',
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
  'pending': {
    label: 'Ожидание',
    className: 'bg-yellow-100 text-yellow-700'
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

export function ConversationsTable({ conversations, onRowClick }: ConversationsTableProps) {
  const { deleteConversation } = useConversations();
  const { user } = useUserStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (conversationToDelete) {
      await deleteConversation(conversationToDelete);
      setIsDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const canDelete = user?.role === 'admin';

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Агент</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Длительность</TableHead>
            <TableHead>Статус</TableHead>
            {canDelete && <TableHead className="pr-6 text-right">Действия</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations
            .filter((conversation) => conversation.agent_name !== null && conversation.agent_name !== undefined)
            .map((conversation) => (
            <TableRow
              key={conversation.conversation_id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(conversation.conversation_id)}
            >
              <TableCell className="pl-6">{conversation.agent_name}</TableCell>
              <TableCell>
                {format(new Date(conversation.start_time_unix_secs * 1000), "d MMM y 'г.', HH:mm", {
                  locale: ru,
                })}
              </TableCell>
              <TableCell>{conversation.call_duration_secs}с</TableCell>
              <TableCell>
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded-full",
                  statusMap[conversation.status]?.className || 'bg-gray-100 text-gray-700'
                )}>
                  {statusMap[conversation.status]?.label || conversation.status}
                </span>
              </TableCell>
              {canDelete && (
                <TableCell className="pr-6 text-right">
                  <div className="flex justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteClick(conversation.conversation_id, e)}
                          className="cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Удалить</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Удалить разговор
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Dialog подтверждения удаления */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить разговор?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Разговор будет навсегда удален из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} className="cursor-pointer">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-500 text-white hover:bg-destructive/80 cursor-pointer"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 