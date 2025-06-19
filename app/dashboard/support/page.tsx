'use client'

import { SupportForm } from '@/components/dashboard/support-form'

export default function SupportPage() {
  return (
    <div className="container mx-auto py-6 px-8">
      <h1 className="text-2xl font-bold mb-2">Служба поддержки</h1>
      <p className="text-muted-foreground mb-6">
        Если у вас возникли вопросы или проблемы, заполните форму ниже, и мы свяжемся с вами в ближайшее время
      </p>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <SupportForm />
        </div>
      </div>
    </div>
  )
} 