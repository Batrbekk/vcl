"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

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
      <div className="relative min-h-svh overflow-hidden bg-zinc-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-red-600/10 blur-[120px]" />
        </div>
        <div className="relative flex min-h-svh items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center backdrop-blur">
            <AlertCircle className="mx-auto h-14 w-14 text-red-400 mb-5" />
            <h1 className="text-2xl font-bold text-white mb-2">Недействительная ссылка</h1>
            <p className="text-sm text-zinc-400 mb-8">Ссылка для сброса пароля истекла или недействительна. Запросите новую.</p>
            <Button onClick={() => router.push("/login")} className="h-11 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 px-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              На страницу входа
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="relative min-h-svh overflow-hidden bg-zinc-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -bottom-32 h-[500px] w-[500px] rounded-full bg-emerald-600/10 blur-[120px]" />
        </div>
        <div className="relative flex min-h-svh items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center backdrop-blur">
            <CheckCircle className="mx-auto h-14 w-14 text-emerald-400 mb-5" />
            <h1 className="text-2xl font-bold text-white mb-2">Пароль изменён</h1>
            <p className="text-sm text-zinc-400">Перенаправляем на страницу входа...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-zinc-950">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute -left-40 -bottom-40 h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      <div className="relative flex min-h-svh items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 backdrop-blur">
          {/* Header */}
          <div className="mb-8 text-center">
            <img src="/logo-icon.svg" alt="VOXI" className="mx-auto h-12 w-12 mb-4" />
            <h1 className="text-2xl font-bold text-white">Новый пароль</h1>
            <p className="mt-2 text-sm text-zinc-400">Введите новый пароль для вашего аккаунта</p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
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
                className="h-11 rounded-xl border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
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
                className="h-11 rounded-xl border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
              />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сбросить пароль"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => router.push("/login")} className="text-sm text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />
              Вернуться на страницу входа
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-600">
            VOXI CRM &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
