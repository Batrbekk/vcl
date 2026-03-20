"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type DemoLead } from "@/data/demo-leads";
import { Badge } from "@/components/ui/badge";
import { Phone, User, GripVertical, Bot, MessageCircle, Instagram } from "lucide-react";

const sourceLabels: Record<DemoLead["source"], string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  website: "Сайт",
  phone: "Телефон",
  manual: "Вручную",
};

const sourceColors: Record<DemoLead["source"], string> = {
  whatsapp: "bg-green-500/20 text-green-400 border-green-500/30",
  instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  website: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  phone: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  manual: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const channelConfig: Record<string, { label: string; icon: typeof Phone; colorClass: string }> = {
  PHONE: { label: "Телефон", icon: Phone, colorClass: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle, colorClass: "bg-green-500/20 text-green-400 border-green-500/30" },
  INSTAGRAM: { label: "Instagram", icon: Instagram, colorClass: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
};

interface LeadCardProps {
  lead: DemoLead;
  onClick: (lead: DemoLead) => void;
  isDragOverlay?: boolean;
}

export function LeadCard({ lead, onClick, isDragOverlay }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const channel = lead.channel || "PHONE";
  const channelInfo = channelConfig[channel] || channelConfig.PHONE;
  const ChannelIcon = channelInfo.icon;

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={`
        group rounded-lg border border-zinc-700/80 bg-zinc-800 p-3
        cursor-pointer transition-colors hover:border-zinc-600 hover:bg-zinc-750
        ${isDragOverlay ? "shadow-2xl shadow-black/50 border-indigo-500/50 rotate-2 scale-105" : ""}
        ${isDragging ? "opacity-40" : ""}
      `}
      onClick={() => onClick(lead)}
    >
      {/* Header: Name + Drag handle */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-white leading-tight truncate">
          {lead.name}
        </h4>
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 rounded p-0.5 text-zinc-600 opacity-0 transition-opacity hover:text-zinc-400 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Phone */}
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
        <Phone className="h-3 w-3 shrink-0" />
        <span className="truncate">{lead.phone}</span>
      </div>

      {/* Source badge + Channel badge + Assignment */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge
            className={`border text-[10px] px-1.5 py-0 h-[18px] leading-tight shrink-0 ${sourceColors[lead.source]}`}
          >
            {sourceLabels[lead.source]}
          </Badge>
          {channel !== "PHONE" && (
            <Badge
              className={`border text-[10px] px-1.5 py-0 h-[18px] leading-tight shrink-0 ${channelInfo.colorClass}`}
            >
              <ChannelIcon className="h-2.5 w-2.5 mr-0.5" />
              {channelInfo.label}
            </Badge>
          )}
        </div>
        {/* Assignment: bot or user */}
        {lead.assignedBotName ? (
          <div className="flex items-center gap-1 text-[11px] text-indigo-400 truncate">
            <Bot className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.assignedBotName}</span>
          </div>
        ) : lead.assignedToName ? (
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 truncate">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.assignedToName.split(" ")[0]}</span>
          </div>
        ) : null}
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-block rounded bg-zinc-700/60 px-1.5 py-0.5 text-[10px] text-zinc-500 truncate max-w-[120px]"
            >
              {tag}
            </span>
          ))}
          {lead.tags.length > 2 && (
            <span className="inline-block rounded bg-zinc-700/60 px-1.5 py-0.5 text-[10px] text-zinc-500">
              +{lead.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** A non-interactive version used inside DragOverlay */
export function LeadCardOverlay({ lead }: { lead: DemoLead }) {
  const channel = lead.channel || "PHONE";
  const channelInfo = channelConfig[channel] || channelConfig.PHONE;
  const ChannelIcon = channelInfo.icon;

  return (
    <div
      className="rounded-lg border border-indigo-500/50 bg-zinc-800 p-3 shadow-2xl shadow-black/50 rotate-2 scale-105 w-[240px]"
    >
      <h4 className="text-sm font-medium text-white leading-tight truncate">
        {lead.name}
      </h4>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
        <Phone className="h-3 w-3 shrink-0" />
        <span className="truncate">{lead.phone}</span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <Badge
          className={`border text-[10px] px-1.5 py-0 h-[18px] leading-tight ${sourceColors[lead.source]}`}
        >
          {sourceLabels[lead.source]}
        </Badge>
        {channel !== "PHONE" && (
          <Badge
            className={`border text-[10px] px-1.5 py-0 h-[18px] leading-tight ${channelInfo.colorClass}`}
          >
            <ChannelIcon className="h-2.5 w-2.5 mr-0.5" />
            {channelInfo.label}
          </Badge>
        )}
      </div>
      {/* Assignment in overlay */}
      {lead.assignedBotName && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-indigo-400">
          <Bot className="h-3 w-3 shrink-0" />
          <span className="truncate">{lead.assignedBotName}</span>
        </div>
      )}
    </div>
  );
}
