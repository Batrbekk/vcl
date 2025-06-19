'use client'

import { useState } from 'react'
import { useKnowledge } from '@/store/use-knowledge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AddUrlForm() {
  const [url, setUrl] = useState('')
  const { addUrlDocument, isLoading } = useKnowledge()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    await addUrlDocument(url)
    setUrl('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="w-full"
        />
      </div>
      <Button type="submit" disabled={isLoading || !url}>
        {isLoading ? 'Добавление...' : 'Добавить URL'}
      </Button>
    </form>
  )
} 