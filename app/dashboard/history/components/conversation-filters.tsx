"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAgentStore } from "@/store/agent-store";

interface ConversationFiltersProps {
  onFiltersChange: (filters: {
    agent_id?: string;
    call_successful?: string;
    call_start_after_unix?: number;
    call_start_before_unix?: number;
  }) => void;
  onClearFilters: () => void;
}

export function ConversationFilters({ onFiltersChange, onClearFilters }: ConversationFiltersProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [agentId, setAgentId] = useState<string>("");
  const [callResult, setCallResult] = useState<string>("");
  
  const { agents, fetchAgents } = useAgentStore();

  useEffect(() => {
    fetchAgents(50); // Загружаем больше агентов для фильтра
  }, [fetchAgents]);

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    applyFilters(newDate, agentId, callResult);
  };

  const handleAgentChange = (value: string) => {
    const newAgentId = value === "all" ? "" : value;
    setAgentId(newAgentId);
    applyFilters(date, newAgentId, callResult);
  };

  const handleCallResultChange = (value: string) => {
    const newCallResult = value === "all" ? "" : value;
    setCallResult(newCallResult);
    applyFilters(date, agentId, newCallResult);
  };

  const applyFilters = (
    dateRange: DateRange | undefined,
    agent: string,
    result: string
  ) => {
    const filters: {
      agent_id?: string;
      call_successful?: string;
      call_start_after_unix?: number;
      call_start_before_unix?: number;
    } = {};

    if (agent) filters.agent_id = agent;
    if (result) filters.call_successful = result;
    if (dateRange?.from) {
      filters.call_start_after_unix = Math.floor(dateRange.from.getTime() / 1000);
    }
    if (dateRange?.to) {
      // Добавляем 23:59:59 к конечной дате
      const endOfDay = new Date(dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      filters.call_start_before_unix = Math.floor(endOfDay.getTime() / 1000);
    }

    onFiltersChange(filters);
  };

  const clearAllFilters = () => {
    setDate(undefined);
    setAgentId("");
    setCallResult("");
    onClearFilters();
  };

  const hasActiveFilters = date || agentId || callResult;

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-background">
      <div className="flex items-center gap-2">
        <span className="font-medium">Фильтр</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="ml-auto h-6 px-2"
          >
            <X className="h-3 w-3 mr-1" />
            Очистить
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Фильтр по дате */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Период</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={date ? "default" : "outline"}
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "d MMM y", { locale: ru })} -{" "}
                      {format(date.to, "d MMM y", { locale: ru })}
                    </>
                  ) : (
                    format(date.from, "d MMM y", { locale: ru })
                  )
                ) : (
                  "Выберите период"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleDateChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Фильтр по агенту */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Агент</label>
          <Select value={agentId || "all"} onValueChange={handleAgentChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Выберите агента" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все агенты</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.agent_id} value={agent.agent_id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Фильтр по результату */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Результат</label>
          <Select value={callResult || "all"} onValueChange={handleCallResultChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Результат" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все результаты</SelectItem>
              <SelectItem value="success">Успешный</SelectItem>
              <SelectItem value="unknown">Без ответа</SelectItem>
              <SelectItem value="failure">Неудачный</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Активные фильтры */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {date && (
            <Badge variant="secondary" className="gap-1">
              Период: {format(date.from!, "d MMM", { locale: ru })}
              {date.to && ` - ${format(date.to, "d MMM", { locale: ru })}`}
              <button
                onClick={() => handleDateChange(undefined)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {agentId && (
            <Badge variant="secondary" className="gap-1">
              Агент: {agents.find(a => a.agent_id === agentId)?.name}
              <button
                onClick={() => handleAgentChange("all")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {callResult && (
            <Badge variant="secondary" className="gap-1">
              Результат: {
                callResult === "success" ? "Успешный" : 
                callResult === "unknown" ? "Без ответа" : 
                callResult === "failure" ? "Неудачный" : 
                "Неудачный"
              }
              <button
                onClick={() => handleCallResultChange("all")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
} 