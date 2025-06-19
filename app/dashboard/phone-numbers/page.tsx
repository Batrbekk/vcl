"use client"

import { useEffect } from "react"
import { usePhoneStore } from "@/store/phone-store"
import { PhoneNumbersTable } from "@/components/dashboard/phone-numbers-table"

export default function PhoneNumbersPage() {
  const { fetchPhoneNumbers } = usePhoneStore()

  useEffect(() => {
    fetchPhoneNumbers()
  }, [fetchPhoneNumbers])

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Номера телефонов</h1>
          <p className="mt-1 text-sm text-gray-500">
            Импортируйте и управляйте своими номерами телефонов
          </p>
        </div>
      </div>
      
      <PhoneNumbersTable />
    </div>
  )
} 