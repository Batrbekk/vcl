'use client'

import { useEffect, useState } from 'react'
import { useKnowledge, DependentAgent } from '@/store/use-knowledge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, FileText, LetterText, Globe, ChevronUp, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { KnowledgeSheet } from "./knowledge-sheet"

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="h-12 w-12 text-gray-400 mb-4">
      <FileText className="h-12 w-12" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-1">
      Нет документов
    </h3>
    <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
      У вас пока нет документов в базе знаний. Добавьте документ, используя одну из опций выше.
    </p>
  </div>
)

const truncateString = (str: string, num: number) => {
  if (str.length <= num) return str
  return str.slice(0, num) + '...'
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

type SortableFields = 'name' | 'type' | 'created_at' | 'size_bytes'

export function KnowledgeList() {
  const { documents, error, fetchDocuments, deleteDocument, fetchDocument } = useKnowledge()
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedDependentAgents, setSelectedDependentAgents] = useState<DependentAgent[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: SortableFields | null
    direction: "asc" | "desc"
  }>({ key: null, direction: "asc" })

  const itemsPerPage = 10

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  if (error) {
    return <div className="text-red-500 text-center py-12">{error}</div>
  }

  if (!documents || documents.length === 0) {
    return <EmptyState />
  }

  const filteredDocuments = documents.filter((doc) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = doc.name.toLowerCase().includes(searchLower)
    const matchesType = typeFilter === "all" || doc.type === typeFilter
    return matchesSearch && matchesType
  })

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (!sortConfig.key) return 0

    if (sortConfig.key === 'created_at') {
      return sortConfig.direction === "asc" 
        ? a.metadata.created_at_unix_secs - b.metadata.created_at_unix_secs
        : b.metadata.created_at_unix_secs - a.metadata.created_at_unix_secs
    }

    if (sortConfig.key === 'size_bytes') {
      return sortConfig.direction === "asc"
        ? a.metadata.size_bytes - b.metadata.size_bytes
        : b.metadata.size_bytes - a.metadata.size_bytes
    }

    if (sortConfig.key === 'name') {
      const comparison = a.name.localeCompare(b.name, 'ru')
      return sortConfig.direction === "asc" ? comparison : -comparison
    }

    if (sortConfig.key === 'type') {
      const comparison = a.type.localeCompare(b.type, 'ru')
      return sortConfig.direction === "asc" ? comparison : -comparison
    }

    return 0
  })

  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedDocuments = sortedDocuments.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  const handleSort = (key: SortableFields) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleDeleteClick = (id: string, name: string) => {
    setDocumentToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocument(documentToDelete.id)
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const handleRowClick = async (id: string) => {
    try {
      const doc = documents.find(d => d.id === id)
      if (doc) {
        setSelectedDependentAgents(doc.dependent_agents)
      }
      await fetchDocument(id)
      setIsSheetOpen(true)
    } catch (error) {
      console.error('Error loading document details:', error)
    }
  }

  const showNoResults = filteredDocuments.length === 0

  // Получаем уникальные типы для фильтра
  const uniqueTypes = Array.from(new Set(documents.map(doc => doc.type)))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 flex gap-4">
          <Input
            placeholder="Поиск по названию..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="max-w-xs"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Все типы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(type)}
                    {type === 'text' ? 'Текст' : type === 'file' ? 'Файл' : type === 'url' ? 'URL' : type}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none px-6"
                onClick={() => handleSort("type")}
              >
                <div className="flex items-center gap-2">
                  Тип
                  {sortConfig.key === "type" ? (
                    sortConfig.direction === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  ) : (
                    <ChevronUp className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none px-6"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-2">
                  Название
                  {sortConfig.key === "name" ? (
                    sortConfig.direction === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  ) : (
                    <ChevronUp className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none px-6"
                onClick={() => handleSort("size_bytes")}
              >
                <div className="flex items-center gap-2">
                  Размер
                  {sortConfig.key === "size_bytes" ? (
                    sortConfig.direction === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  ) : (
                    <ChevronUp className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none px-6"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center gap-2">
                  Создано
                  {sortConfig.key === "created_at" ? (
                    sortConfig.direction === "asc" ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  ) : (
                    <ChevronUp className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead className="px-6 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showNoResults ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      По вашему запросу ничего не найдено
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedDocuments.map((doc) => (
                <TableRow 
                  key={doc.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(doc.id)}
                >
                  <TableCell className="px-6">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center w-8">
                          {getTypeIcon(doc.type)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {doc.type === 'text' ? 'Текст' : doc.type === 'file' ? 'Файл' : doc.type === 'url' ? 'URL' : doc.type}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="px-6">{truncateString(doc.name, 50)}</TableCell>
                  <TableCell className="px-6">
                    {formatFileSize(doc.metadata.size_bytes)}
                  </TableCell>
                  <TableCell className="px-6">
                    {format(new Date(doc.metadata.created_at_unix_secs * 1000), 'dd MMM yyyy г., HH:mm', {
                      locale: ru,
                    })}
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="flex gap-2 justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(doc.id, doc.name)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Удалить</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Удалить документ
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!showNoResults && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Показано {startIndex + 1}-
            {Math.min(startIndex + itemsPerPage, sortedDocuments.length)} из{" "}
            {sortedDocuments.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Предыдущая
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Следующая
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить документ</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить документ &quot;{documentToDelete?.name}&quot;? 
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-500 text-white hover:bg-destructive/80 cursor-pointer"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <KnowledgeSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false)
        }}
        dependentAgents={selectedDependentAgents}
      />
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
} 