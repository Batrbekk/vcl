"use client"

import { useEffect } from "react"
import { ManagerTable } from "@/components/dashboard/manager-table"
import { Manager, useManagerStore } from "@/store/managers-store"
import { Loader } from "@/components/ui/loader"

export default function ManagersPage() {
  const { deleteManager, fetchManagers, updateManager, isLoading } = useManagerStore()

  useEffect(() => {
    fetchManagers()
  }, [fetchManagers])

  const handleEdit = async (manager: Manager) => {
    await updateManager(manager.id, manager)
  }

  const handleDelete = async (id: string) => {
    await deleteManager(id)
  }

  return (
    <div className="min-h-screen w-full p-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление менеджерами</h1>
      </div>
      {isLoading ? (
        <Loader />
      ) : (
        <ManagerTable onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </div>
  )
}
