'use client'

import { useState } from 'react'
import { useKnowledge } from '@/store/use-knowledge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function AddTextForm() {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const { addTextDocument, isLoading } = useKnowledge()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !content) return

    await addTextDocument(name, content)
    setName('')
    setContent('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="Название документа"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full"
        />
      </div>
      <div>
        <Textarea
          placeholder="Введите текст..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          className="w-full min-h-[200px]"
        />
      </div>
      <Button type="submit" disabled={isLoading || !name || !content}>
        {isLoading ? 'Создание...' : 'Создать документ'}
      </Button>
    </form>
  )
} 