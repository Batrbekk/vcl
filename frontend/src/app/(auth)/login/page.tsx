"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Неверный email или пароль");
      } else {
        router.push("/");
      }
    } catch {
      setError("Произошла ошибка. Попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-zinc-950">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-pink-600/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-20 h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[100px]" />
      </div>

      <div className="relative grid min-h-svh lg:grid-cols-2">

        {/* ═══ Left — Art panel ═══ */}
        <div className="relative hidden lg:block p-4">
          <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/[0.08]">
            {/* Gradient base */}
            <div className="absolute inset-0" style={{
              background: "linear-gradient(160deg, #0c0118 0%, #0a1230 30%, #12082a 60%, #180a2e 100%)",
            }} />

            {/* Color waves */}
            <div className="absolute inset-0" style={{
              background: `
                radial-gradient(ellipse 100% 70% at 30% 85%, rgba(139, 92, 246, 0.5) 0%, transparent 55%),
                radial-gradient(ellipse 80% 50% at 75% 45%, rgba(59, 130, 246, 0.3) 0%, transparent 55%),
                radial-gradient(ellipse 70% 45% at 15% 45%, rgba(236, 72, 153, 0.35) 0%, transparent 55%),
                radial-gradient(ellipse 90% 60% at 85% 85%, rgba(124, 58, 237, 0.25) 0%, transparent 55%)
              `,
              animation: "drift 12s ease-in-out infinite alternate",
            }} />

            {/* Streaks */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -left-20 top-[18%] h-[1.5px] w-[160%] rotate-[22deg] bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: "streak 8s ease-in-out infinite" }} />
              <div className="absolute -left-20 top-[38%] h-[2px] w-[160%] rotate-[18deg] bg-gradient-to-r from-transparent via-indigo-300/15 to-transparent" style={{ animation: "streak 10s ease-in-out 2s infinite" }} />
              <div className="absolute -left-20 top-[60%] h-[1px] w-[160%] rotate-[26deg] bg-gradient-to-r from-transparent via-pink-300/10 to-transparent" style={{ animation: "streak 9s ease-in-out 4s infinite" }} />
            </div>

            {/* Content */}
            <div className="relative flex h-full flex-col justify-between p-10">
              {/* Top — Logo */}
              <div className="flex items-center gap-3">
                <img src="/logo-icon.svg" alt="VOXI" className="h-7 w-7" />
                <span className="font-[var(--font-outfit)] text-sm font-semibold tracking-wide text-white/70">
                  VOXI
                </span>
              </div>

              {/* Bottom — Headline */}
              <div className="pb-2">
                <h2 className="font-[var(--font-playfair)] text-5xl font-bold italic leading-[1.15] text-white">
                  Get<br />
                  Everything<br />
                  You Want
                </h2>
                <p className="mt-5 max-w-[300px] text-[13px] leading-relaxed text-white/35">
                  AI-платформа автоматизации B2B продаж. Квалификация лидов и управление воронкой — всё в одном месте.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Right — Form ═══ */}
        <div className="flex flex-col bg-white dark:bg-zinc-950">
          {/* Form centered */}
          <div className="flex flex-1 items-center justify-center px-8">
            <div className="w-full max-w-[360px]">
              {/* Heading */}
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                  Добро пожаловать
                </h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Введите email и пароль для входа в аккаунт
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Введите email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50/80 text-zinc-900 placeholder:text-zinc-400 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Пароль
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Введите пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 rounded-xl border-zinc-200 bg-zinc-50/80 pr-10 text-zinc-900 placeholder:text-zinc-400 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Checkbox />
                    Запомнить меня
                  </label>
                  <a href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                    Забыли пароль?
                  </a>
                </div>

                {/* Sign In */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Вход...
                    </>
                  ) : (
                    "Войти"
                  )}
                </Button>
              </form>

              {/* Demo */}
              <div className="mt-6 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-center dark:border-zinc-800 dark:bg-zinc-800/50">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Демо: <span className="font-mono text-zinc-700 dark:text-zinc-300">almat@nurbolinvest.kz</span> / <span className="font-mono text-zinc-700 dark:text-zinc-300">demo123</span>
                </p>
              </div>

              <p className="mt-8 text-center text-xs text-zinc-400">
                VOXI CRM &copy; {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drift {
          0% { transform: scale(1) translate(0, 0); }
          33% { transform: scale(1.05) translate(8px, -8px); }
          66% { transform: scale(0.97) translate(-4px, 4px); }
          100% { transform: scale(1.02) translate(4px, -4px); }
        }
        @keyframes streak {
          0%, 100% { opacity: 0; transform: translateX(-15%) rotate(22deg); }
          50% { opacity: 1; transform: translateX(5%) rotate(22deg); }
        }
      `}</style>
    </div>
  );
}
