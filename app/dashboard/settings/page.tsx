'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from '@/components/dashboard/profile-form'
import { PasswordForm } from '@/components/dashboard/password-form'
import { Loader } from '@/components/ui/loader'
import { useUserStore } from '@/store/user-store'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { isLoading } = useUserStore()

  return (
    <div className="container mx-auto py-6 px-8 relative">
      {isLoading && <Loader />}
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="profile" className="cursor-pointer">Профиль</TabsTrigger>
              <TabsTrigger value="password" className="cursor-pointer">Смена пароля</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <ProfileForm />
            </TabsContent>
            
            <TabsContent value="password">
              <PasswordForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 