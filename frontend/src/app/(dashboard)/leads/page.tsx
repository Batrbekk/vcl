"use client";

import dynamic from "next/dynamic";

const KanbanBoard = dynamic(
  () => import("@/components/leads/kanban-board").then((m) => m.KanbanBoard),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Загрузка...</div> }
);

export default function LeadsPage() {
  return (
    <div className="flex flex-col h-[calc(100svh-3.5rem-3rem)] overflow-hidden">
      <KanbanBoard />
    </div>
  );
}
