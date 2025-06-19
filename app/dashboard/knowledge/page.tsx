'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KnowledgeList } from '@/components/dashboard/knowledge-list'
import { AddUrlForm } from '@/components/dashboard/add-url-form'
import { AddFileForm } from '@/components/dashboard/add-file-form'
import { AddTextForm } from '@/components/dashboard/add-text-form'
import { RagStorageInfo } from '@/components/dashboard/rag-storage-info'
import { Loader } from '@/components/ui/loader'
import { useKnowledge } from '@/store/use-knowledge'

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState('url')
  const { isLoading } = useKnowledge()

  return (
    <div className="container mx-auto py-6 px-8 relative">
      {isLoading && <Loader />}
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">База знаний</h1>
        <RagStorageInfo />
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="url">Добавить URL</TabsTrigger>
              <TabsTrigger value="file">Загрузить файл</TabsTrigger>
              <TabsTrigger value="text">Создать текст</TabsTrigger>
            </TabsList>
            
            <TabsContent value="url">
              <AddUrlForm />
            </TabsContent>
            
            <TabsContent value="file">
              <AddFileForm />
            </TabsContent>
            
            <TabsContent value="text">
              <AddTextForm />
            </TabsContent>
          </Tabs>
        </div>

        <KnowledgeList />
      </div>
    </div>
  )
} 