import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePhoneStore } from "@/store/phone-store"
import { Phone, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ImportPhoneNumberDialog } from "./import-phone-number-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="h-12 w-12 text-gray-400 mb-4">
      <Phone className="h-12 w-12" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-1">
      Номера телефонов не найдены
    </h3>
    <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
      Измените параметры фильтрации или импортируйте новый номер
    </p>
  </div>
)

export function PhoneNumbersTable() {
  const router = useRouter()
  const { phoneNumbers, isLoading, deletePhoneNumber } = usePhoneStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [phoneNumberToDelete, setPhoneNumberToDelete] = useState<{ id: string; label: string } | null>(null)
  const itemsPerPage = 10

  const filteredPhoneNumbers = phoneNumbers?.filter(phoneNumber => 
    phoneNumber?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    phoneNumber?.phone_number?.includes(searchQuery)
  ) || []

  const totalPages = Math.ceil(filteredPhoneNumbers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPhoneNumbers = filteredPhoneNumbers.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  const handleDeleteClick = (phoneNumberId: string, label: string) => {
    setPhoneNumberToDelete({ id: phoneNumberId, label })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (phoneNumberToDelete) {
      try {
        await deletePhoneNumber(phoneNumberToDelete.id)
        setDeleteDialogOpen(false)
        setPhoneNumberToDelete(null)
      } catch {
        // Ошибка уже обработана в store
      }
    }
  }

  const handleRowClick = (phoneNumberId: string) => {
    router.push(`/dashboard/phone-numbers/${phoneNumberId}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 flex gap-4">
            <Input
              placeholder="Поиск номеров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
              disabled
            />
          </div>
          <ImportPhoneNumberDialog />
        </div>
        <div className="rounded-md border relative min-h-[400px] flex items-center justify-center">
          <div className="text-sm text-gray-500">Загрузка...</div>
        </div>
      </div>
    )
  }

  if (!phoneNumbers || phoneNumbers.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 flex gap-4">
            <Input
              placeholder="Поиск номеров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <ImportPhoneNumberDialog />
        </div>
        <div className="rounded-md border relative min-h-[400px]">
          <EmptyState />
        </div>
      </div>
    )
  }

  const showNoResults = filteredPhoneNumbers.length === 0

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 flex gap-4">
          <Input
            placeholder="Поиск номеров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <ImportPhoneNumberDialog />
      </div>

      <div className="rounded-md border relative min-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">Имя</TableHead>
              <TableHead className="px-6">Номер телефона</TableHead>
              <TableHead className="px-6">Провайдер</TableHead>
              <TableHead className="px-6 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showNoResults ? (
              <TableRow>
                <TableCell colSpan={4} className="h-[400px] p-0">
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              paginatedPhoneNumbers.map((phoneNumber, index) => (
                <TableRow 
                  key={phoneNumber?.phone_number_id || `phone-${index}`} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleRowClick(phoneNumber.phone_number_id)}
                >
                  <TableCell className="font-medium px-6">{phoneNumber.label}</TableCell>
                  <TableCell className="px-6 font-mono text-sm">{phoneNumber.phone_number}</TableCell>
                  <TableCell className="px-6">
                    <span className="capitalize">
                      {phoneNumber.provider === "sip_trunk" ? "SIP Trunk" : phoneNumber.provider}
                    </span>
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(phoneNumber.phone_number_id, phoneNumber.label)
                            }}
                            className="cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Удалить</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Удалить
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
            {Math.min(startIndex + itemsPerPage, filteredPhoneNumbers.length)} из{" "}
            {filteredPhoneNumbers.length}
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
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить номер телефона &quot;{phoneNumberToDelete?.label}&quot;?
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
    </div>
  )
} 