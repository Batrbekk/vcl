"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  UserPlus,
  Pencil,
  Trash2,
  Users,
  Crown,
  Shield,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { usersData as demoUsersData, organizationData } from "@/data/seed";
import { AddMemberDialog } from "@/components/team/add-member-dialog";

// ── Role badge ──────────────────────────────────────────────────

const roleLabelMap: Record<string, string> = {
  owner: "OWNER",
  OWNER: "OWNER",
  admin: "ADMIN",
  ADMIN: "ADMIN",
  manager: "MANAGER",
  MANAGER: "MANAGER",
};

function RoleBadge({ role }: { role: string }) {
  const normalized = role.toLowerCase();
  const label = roleLabelMap[role] || role.toUpperCase();

  if (normalized === "owner") {
    return (
      <Badge className="gap-1 border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
        <Crown className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (normalized === "admin") {
    return (
      <Badge className="gap-1 border-amber-500/20 bg-amber-500/10 text-amber-400">
        <Shield className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 border-zinc-600 bg-zinc-800 text-zinc-300">
      <Shield className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────────────

interface TeamUser {
  id?: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export default function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>(demoUsersData);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTeam = useCallback(() => {
    fetch("/api/team")
      .then((res) => {
        if (!res.ok) throw new Error("API not available");
        return res.json();
      })
      .then((data) => {
        if (data.users && data.users.length > 0) {
          setUsers(data.users);
        }
      })
      .catch(() => {
        // API not available — keep using demo seed data
      });
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // ── Delete handler ────────────────────────────────────────────
  async function handleDelete(user: TeamUser) {
    if (!user.id) return;

    const confirmed = confirm(
      `Вы уверены, что хотите удалить сотрудника "${user.name}"? Это действие нельзя отменить.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);

    try {
      const res = await fetch(`/api/team/${user.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Не удалось удалить сотрудника");
        return;
      }

      fetchTeam();
    } catch {
      alert("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Edit role handler ─────────────────────────────────────────
  function startEdit(user: TeamUser) {
    if (!user.id) return;
    setEditingId(user.id);
    setEditRole(user.role.toUpperCase());
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRole("");
  }

  async function saveEdit(userId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Не удалось обновить роль");
        return;
      }

      setEditingId(null);
      setEditRole("");
      fetchTeam();
    } catch {
      alert("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  const maxUsers = 10;
  const currentUsers = users.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Команда {organizationData.name}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Управление сотрудниками и ролями
          </p>
        </div>
        <Button
          className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
          onClick={() => setAddDialogOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Добавить сотрудника
        </Button>
      </div>

      {/* Team table */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Имя</TableHead>
                <TableHead className="text-zinc-400">Email</TableHead>
                <TableHead className="text-zinc-400">Роль</TableHead>
                <TableHead className="text-zinc-400">Статус</TableHead>
                <TableHead className="text-right text-zinc-400">
                  Действия
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id || user.email}
                  className="border-zinc-800 hover:bg-zinc-800/50"
                >
                  <TableCell className="font-medium text-white">
                    {user.name}
                  </TableCell>
                  <TableCell className="text-zinc-400">{user.email}</TableCell>
                  <TableCell>
                    {editingId === user.id ? (
                      <Select value={editRole} onValueChange={(v) => v && setEditRole(v)}>
                        <SelectTrigger className="h-8 w-32 border-zinc-700 bg-zinc-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-700 bg-zinc-800">
                          <SelectItem value="OWNER">OWNER</SelectItem>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                          <SelectItem value="MANAGER">MANAGER</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <RoleBadge role={user.role} />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-sm text-zinc-300">Активен</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === user.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={saving}
                            onClick={() => saveEdit(user.id!)}
                            className="gap-1 text-emerald-400 hover:text-emerald-300"
                          >
                            {saving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Сохранить
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                            className="gap-1 text-zinc-400 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                            Отмена
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(user)}
                            className="gap-1.5 text-zinc-400 hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Редактировать
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === user.id}
                            onClick={() => handleDelete(user)}
                            className="gap-1.5 text-zinc-400 hover:text-red-400"
                          >
                            {deletingId === user.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Удалить
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan limits */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <Users className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-white">Лимиты плана</CardTitle>
              <CardDescription className="text-zinc-400">
                Ваш текущий тариф и ограничения по количеству пользователей
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator className="bg-zinc-800" />
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Тарифный план</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-semibold text-white">
                  PREMIUM
                </span>
                <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400">
                  Активен
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Пользователи</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {currentUsers}{" "}
                <span className="text-sm font-normal text-zinc-500">
                  из {maxUsers}
                </span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${(currentUsers / maxUsers) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {currentUsers} из {maxUsers} сотрудников — вы можете добавить ещё{" "}
              {maxUsers - currentUsers}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add member dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={fetchTeam}
      />
    </div>
  );
}
