"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-500">Загрузка...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (!token) {
      setError("Недействительная ссылка");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка сброса пароля");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch {
      setError("Произошла ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-sm text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Недействительная ссылка</h1>
          <p className="text-sm text-zinc-400 mb-6">Запросите сброс пароля заново.</p>
          <Button onClick={() => router.push("/login")} className="bg-indigo-600 text-white hover:bg-indigo-700">
            На страницу входа
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-sm text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-400 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Пароль изменён</h1>
          <p className="text-sm text-zinc-400">Перенаправляем на страницу входа...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo-icon.svg" alt="VOXI" className="mx-auto h-10 w-10 mb-3" />
          <h1 className="text-2xl font-bold text-white">Новый пароль</h1>
          <p className="mt-2 text-sm text-zinc-400">Введите новый пароль для вашего аккаунта</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-zinc-300">Новый пароль</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              className="h-11 rounded-xl border-zinc-700 bg-zinc-800 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300">Подтвердите пароль</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              required
              className="h-11 rounded-xl border-zinc-700 bg-zinc-800 text-white"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сбросить пароль"}
          </Button>
        </form>
      </div>
    </div>
  );
}
