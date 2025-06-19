"use client";

import { useEffect, useState } from "react";
import { useConversations } from "@/store/use-conversations";
import { ConversationsTable } from "./components/conversations-table";
import { ConversationFilters } from "./components/conversation-filters";
import { PageHeader } from "@/components/page-header";
import { ConversationSheet } from "@/components/dashboard/conversation-sheet";
import { Loader2, MessageSquare } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function HistoryPage() {
  const { 
    conversations, 
    fetchConversations, 
    fetchConversationDetails,
    isLoading,
    currentConversation,
    setFilters,
    clearFilters
  } = useConversations();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!isLoading && currentConversation?.conversation_id === selectedId) {
      setIsSheetOpen(true);
    }
  }, [isLoading, currentConversation, selectedId, isSheetOpen]);

  const handleRowClick = async (id: string) => {
    try {
      setSelectedId(id);
      await fetchConversationDetails(id);
    } catch (error) {
      console.error('Error loading conversation details:', error);
      setSelectedId(null);
    }
  };

  const handleFiltersChange = (filters: {
    agent_id?: string;
    call_successful?: string;
    call_start_after_unix?: number;
    call_start_before_unix?: number;
  }) => {
    setFilters(filters);
    fetchConversations(filters);
    setCurrentPage(1); // Сброс на первую страницу при изменении фильтров
  };

  const handleClearFilters = () => {
    clearFilters();
    fetchConversations();
    setCurrentPage(1);
  };

  // Пагинация на фронте
  const totalItems = conversations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConversations = conversations.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="История звонков"
        description="Просмотр и управление историей звонков"
      />
      
      <ConversationFilters
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />
      
      {isLoading && conversations.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border rounded-lg bg-muted/30">
          <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Нет разговоров
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            История звонков пуста. Разговоры появятся здесь после первых звонков.
          </p>
        </div>
      ) : (
        <>
          <ConversationsTable
            conversations={paginatedConversations}
            onRowClick={handleRowClick}
          />
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) handlePageChange(currentPage - 1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(page);
                        }}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) handlePageChange(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      <ConversationSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setSelectedId(null);
        }}
      />
    </div>
  );
} 