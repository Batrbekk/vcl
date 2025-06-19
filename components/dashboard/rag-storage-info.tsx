'use client'

import { useEffect } from 'react'
import { useKnowledge } from '@/store/use-knowledge'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'kB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
}

export function RagStorageInfo() {
  const { ragIndex, fetchRagIndex } = useKnowledge()

  useEffect(() => {
    fetchRagIndex()
  }, [fetchRagIndex])

  if (!ragIndex) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2">
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span>
        RAG Storage: <span className="font-bold">{formatBytes(ragIndex.total_used_bytes)}</span> / {formatBytes(ragIndex.total_max_bytes)}
      </span>
    </div>
  )
} 