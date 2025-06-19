'use client'

import { useState } from 'react'
import { useKnowledge } from '@/store/use-knowledge'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

export function AddFileForm() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { addFileDocument, isLoading } = useKnowledge()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    try {
      setUploadProgress(0)
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval)
            return prev
          }
          return prev + 5
        })
      }, 500)

      await addFileDocument(file)
      clearInterval(interval)
      setUploadProgress(100)
      
      setTimeout(() => {
        setUploadProgress(0)
        setFile(null)
        // Очищаем input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      }, 1000)
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadProgress(0)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept=".epub,.pdf,.docx,.txt,.html"
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center justify-center gap-2"
        >
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-sm text-gray-600">
            {file ? (
              <span className="text-blue-500">{file.name}</span>
            ) : (
              <>
                Нажмите для загрузки или перетащите файл
                <p className="text-xs text-gray-400 mt-1">
                  Поддерживаемые форматы: EPUB, PDF, DOCX, TXT, HTML
                </p>
              </>
            )}
          </div>
        </label>
      </div>
      
      {uploadProgress > 0 && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-gray-500 text-center">
            {uploadProgress < 100 ? 'Загрузка...' : 'Загрузка завершена!'}
          </p>
        </div>
      )}

      <Button type="submit" disabled={isLoading || !file || uploadProgress > 0}>
        {isLoading ? 'Загрузка...' : 'Загрузить файл'}
      </Button>
    </form>
  )
} 