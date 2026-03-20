"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { demoLeads, type DemoLead } from "@/data/demo-leads";
import { pipelineData } from "@/data/seed";
import { LeadCard, LeadCardOverlay } from "@/components/leads/lead-card";
import { LeadDetailDialog } from "@/components/leads/lead-detail-dialog";
import { AddLeadDialog } from "@/components/leads/add-lead-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Users } from "lucide-react";

type Stage = { id: string; name: string; order: number; color: string };

export function KanbanBoard() {
  const [leads, setLeads] = useState<DemoLead[]>(demoLeads);
  const [stages, setStages] = useState<Stage[]>(pipelineData.stages);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<DemoLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [teamUsers, setTeamUsers] = useState<{ id: string; name: string }[]>([]);
  const [pipelineId, setPipelineId] = useState("");

  // Fetch leads from API
  const fetchLeads = useCallback(() => {
    fetch("/api/leads")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch leads");
        return res.json();
      })
      .then((data) => {
        const leadsArray = Array.isArray(data) ? data : data.leads;
        if (!leadsArray || !Array.isArray(leadsArray) || leadsArray.length === 0) return;

        // Extract unique stages from leads data
        const stageMap = new Map<string, Stage>();
        for (const l of leadsArray) {
          if (l.stage && !stageMap.has(l.stage.id)) {
            stageMap.set(l.stage.id, {
              id: l.stage.id,
              name: l.stage.name,
              color: l.stage.color || "#6366f1",
              order: l.stage.order ?? 0,
            });
          }
        }

        if (stageMap.size > 0) {
          const sortedStages = Array.from(stageMap.values()).sort(
            (a, b) => a.order - b.order
          );
          setStages(sortedStages);
        }

        // Extract pipelineId from first lead
        const firstPipeline = leadsArray[0]?.pipelineId || leadsArray[0]?.pipeline?.id || "";
        if (firstPipeline) setPipelineId(firstPipeline);

        // Map DB leads to DemoLead format
        const mapped: DemoLead[] = leadsArray.map((l: any) => ({
          id: l.id,
          stageId: l.stageId,
          name: l.name,
          phone: l.phone,
          email: l.email || undefined,
          source: l.source?.toLowerCase() || "manual",
          status: l.status?.toLowerCase() || "new",
          assignedTo: l.assignedToId || l.assignedTo?.id || null,
          assignedToName: l.assignedTo?.name || null,
          assignedBotId: l.assignedBotId || l.assignedBot?.id || null,
          assignedBotName: l.assignedBot?.name || null,
          channel: l.channel || "PHONE",
          tags: l.tags || [],
          notes: l.notes || "",
          lastContactAt: l.lastContactAt || l.createdAt,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt || l.createdAt,
          organizationId: l.organizationId,
          pipelineId: l.pipelineId || l.pipeline?.id || "",
        }));
        setLeads(mapped);
      })
      .catch(() => {
        // Keep demo data as fallback
      });
  }, []);

  // Fetch leads and stages from API on mount
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Fetch team users for the add-lead dialog
  useEffect(() => {
    fetch("/api/team")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch team");
        return res.json();
      })
      .then((data) => {
        if (data.users && data.users.length > 0) {
          setTeamUsers(
            data.users.map((u: any) => ({ id: u.id, name: u.name }))
          );
        }
      })
      .catch(() => {
        // Team API not available — assigned-to selector will be hidden
      });
  }, []);

  // Filter leads by search query
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter((lead) => lead.name.toLowerCase().includes(query));
  }, [leads, searchQuery]);

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, DemoLead[]> = {};
    for (const stage of stages) {
      grouped[stage.id] = filteredLeads.filter((l) => l.stageId === stage.id);
    }
    return grouped;
  }, [filteredLeads, stages]);

  // Active drag lead
  const activeLead = useMemo(
    () => leads.find((l) => l.id === activeId) ?? null,
    [leads, activeId]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const activeLeadId = String(active.id);
      const overId = String(over.id);

      // Determine the target stage
      // The overId can be either a lead id or a stage id (droppable column)
      let targetStageId: string | null = null;

      // Check if overId is a stage id
      const isStage = stages.some((s) => s.id === overId);
      if (isStage) {
        targetStageId = overId;
      } else {
        // overId is a lead — find its stage
        const overLead = leads.find((l) => l.id === overId);
        if (overLead) {
          targetStageId = overLead.stageId;
        }
      }

      if (!targetStageId) return;

      // Move active lead to target stage
      const activeLead = leads.find((l) => l.id === activeLeadId);
      if (!activeLead || activeLead.stageId === targetStageId) return;

      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          l.id === activeLeadId ? { ...l, stageId: targetStageId! } : l
        )
      );

      // Persist the stage change via API
      fetch(`/api/leads/${activeLeadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: targetStageId }),
      }).catch(() => {
        // Revert on failure
        setLeads((prev) =>
          prev.map((l) =>
            l.id === activeLeadId
              ? { ...l, stageId: activeLead.stageId }
              : l
          )
        );
      });
    },
    [leads, stages]
  );

  const handleCardClick = useCallback((lead: DemoLead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden min-w-0">
      {/* Top toolbar */}
      <div className="flex items-center gap-3 py-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Поиск по имени..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Users className="h-4 w-4" />
          <span>{filteredLeads.length} лидов</span>
        </div>
        <Button
          className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white border-0 h-9 gap-1.5"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Добавить лид
        </Button>
      </div>

      {/* Kanban columns */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden py-4 min-h-0 min-w-0">
          <div className="flex gap-4 h-full min-w-max">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={leadsByStage[stage.id] || []}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeLead ? <LeadCardOverlay lead={activeLead} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Detail dialog */}
      <LeadDetailDialog
        lead={selectedLead}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdated={fetchLeads}
      />

      {/* Add lead dialog */}
      <AddLeadDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        stages={stages}
        users={teamUsers}
        pipelineId={pipelineId}
        onCreated={fetchLeads}
      />
    </div>
  );
}

// ─── Column Component ──────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: Stage;
  leads: DemoLead[];
  onCardClick: (lead: DemoLead) => void;
}

function KanbanColumn({ stage, leads, onCardClick }: KanbanColumnProps) {
  const leadIds = useMemo(() => leads.map((l) => l.id), [leads]);

  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "column", stageId: stage.id },
  });

  return (
    <div className="flex flex-col w-[280px] shrink-0 h-full min-h-0">
      {/* Column header */}
      <div className="flex items-center gap-2 pb-3 px-1">
        <div
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <h3 className="text-sm font-medium text-zinc-300 truncate">
          {stage.name}
        </h3>
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-800 px-1.5 text-[11px] font-medium text-zinc-400">
          {leads.length}
        </span>
      </div>

      {/* Column body */}
      <SortableContext
        id={stage.id}
        items={leadIds}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex-1 rounded-lg border min-h-0 overflow-y-auto transition-colors ${
            isOver
              ? "bg-zinc-800/60 border-indigo-500/40"
              : "bg-zinc-900/50 border-zinc-800/80"
          }`}
        >
          <div className="flex flex-col gap-2 p-2 min-h-[200px]">
            {leads.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-xs text-zinc-600">
                Нет лидов
              </div>
            ) : (
              leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={onCardClick}
                />
              ))
            )}
          </div>
        </div>
      </SortableContext>
    </div>
  );
}
