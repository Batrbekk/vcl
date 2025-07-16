"use client"

import { useState } from "react"
import type { FC } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Manager, useManagerStore } from "@/store/managers-store"
import { Users2 } from "lucide-react"
import { CreateManagerDialog } from "./create-manager-dialog"
import { DeleteManagerDialog } from "./delete-manager-dialog"
import { EditManagerDialog } from "./edit-manager-dialog"

interface ManagerTableProps {
  onEdit: (manager: Manager) => void
  onDelete: (id: string) => void
}

const EmptyState: FC = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="h-12 w-12 text-gray-400 mb-4">
      <Users2 className="h-12 w-12" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-1">
      Нет менеджеров
    </h3>
    <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
      Похоже, что список менеджеров пуст. Начните с добавления нового менеджера, нажав кнопку &#34;Добавить менеджера&#34;.
    </p>
    <CreateManagerDialog />
  </div>
)

export const ManagerTable: FC<ManagerTableProps> = ({ onEdit, onDelete }) => {
  const managers = useManagerStore((state) => state.managers)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Manager | null
    direction: "asc" | "desc"
  }>({ key: null, direction: "asc" })

  const itemsPerPage = 10

  const filteredManagers = managers.filter((manager) => {
    if (!manager) return false
    const searchLower = searchTerm.toLowerCase()
    return (
      (manager.firstName?.toLowerCase() || '').includes(searchLower) ||
      (manager.lastName?.toLowerCase() || '').includes(searchLower) ||
      (manager.email?.toLowerCase() || '').includes(searchLower)
    )
  })

  const sortedManagers = [...filteredManagers].sort((a, b) => {
    if (!sortConfig.key) return 0
    
    const aValue = a[sortConfig.key] || ''
    const bValue = b[sortConfig.key] || ''
    
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
    return 0
  })

  const totalPages = Math.ceil(sortedManagers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedManagers = sortedManagers.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  const handleSort = (key: keyof Manager) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  if (!managers || managers.length === 0) {
    return <EmptyState />
  }

  const showNoResults = filteredManagers.length === 0

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Поиск по имени или email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <CreateManagerDialog />
      </div>

      <div className="rounded-md border relative min-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer px-6"
                onClick={() => handleSort("firstName")}
              >
                Имя {sortConfig.key === "firstName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="cursor-pointer px-6"
                onClick={() => handleSort("lastName")}
              >
                Фамилия {sortConfig.key === "lastName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="cursor-pointer px-6"
                onClick={() => handleSort("email")}
              >
                Email {sortConfig.key === "email" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead
                className="cursor-pointer px-6"
                onClick={() => handleSort("companyName")}
              >
                Компания {sortConfig.key === "companyName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </TableHead>
              <TableHead className="px-6 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showNoResults ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Users2 className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      По вашему запросу ничего не найдено
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedManagers.map((manager) => (
                <TableRow key={manager.id}>
                  <TableCell className="px-6">{manager.firstName || ''}</TableCell>
                  <TableCell className="px-6">{manager.lastName || ''}</TableCell>
                  <TableCell className="px-6">{manager.email || ''}</TableCell>
                  <TableCell className="px-6">{manager.companyName || ''}</TableCell>
                  <TableCell className="px-6">
                    <div className="flex gap-2 justify-end">
                      <EditManagerDialog
                        manager={manager}
                        onEdit={onEdit}
                      />
                      <DeleteManagerDialog 
                        onConfirm={() => onDelete(manager.id)}
                      />
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
            {Math.min(startIndex + itemsPerPage, sortedManagers.length)} из{" "}
            {sortedManagers.length}
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
    </div>
  )
} 