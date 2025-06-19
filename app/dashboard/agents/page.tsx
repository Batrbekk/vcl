"use client"

import { useEffect } from "react"
import { useAgentStore } from "@/store/agent-store"
import { Loader } from "@/components/ui/loader"
import { AgentTable } from "@/components/dashboard/agent-table"

export default function AgentsPage() {
  const { fetchAgents, isLoading } = useAgentStore()

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  return (
    <div className="min-h-screen w-full p-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Агенты</h1>
      </div>
      
      {isLoading ? (
        <Loader />
      ) : (
        <AgentTable />
      )}
    </div>
  )
}
