"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  OWNER: "Полный доступ, управление организацией",
  ADMIN: "Управление ботами, лидами, командой",
  MANAGER: "Работа с лидами и звонками",
};

export function AddMemberDialog({
  open,
  onOpenChange,
  onCreated,
}: AddMemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MANAGER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("MANAGER");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Все поля обязательны для заполнения");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Не удалось создать сотрудника");
        return;
      }

      resetForm();
      onOpenChange(false);
      onCreated();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="border-zinc-800 bg-zinc-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            Добавить сотрудника
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Новый сотрудник получит доступ к платформе по email и паролю.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="member-name" className="text-zinc-300">
              Имя
            </Label>
            <Input
              id="member-name"
              placeholder="Имя Фамилия"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="member-email" className="text-zinc-300">
              Email
            </Label>
            <Input
              id="member-email"
              type="email"
              placeholder="user@company.kz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="member-password" className="text-zinc-300">
              Пароль
            </Label>
            <Input
              id="member-password"
              type="password"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              required
              minLength={6}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Роль</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger className="w-full border-zinc-700 bg-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-800">
                <SelectItem value="OWNER">OWNER</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="MANAGER">MANAGER</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Footer */}
          <DialogFooter className="gap-2 border-zinc-800 bg-zinc-900/50">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              className="text-zinc-400 hover:text-white"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
