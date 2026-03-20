"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Check,
  Zap,
  Star,
  Crown,
  Sparkles,
} from "lucide-react";

// ── Plan data ───────────────────────────────────────────────────

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  priceNote: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  features: string[];
  isCurrent: boolean;
  isHighlighted: boolean;
}

const plans: PricingPlan[] = [
  {
    id: "trial",
    name: "TRIAL",
    price: "0",
    priceNote: "тг/мес",
    badge: "Бесплатный",
    badgeColor: "border-zinc-600 bg-zinc-800 text-zinc-400",
    icon: <Zap className="h-5 w-5 text-zinc-400" />,
    features: [
      "100 минут звонков",
      "1 пользователь",
      "Базовая аналитика",
      "Email поддержка",
    ],
    isCurrent: false,
    isHighlighted: false,
  },
  {
    id: "basic",
    name: "BASIC",
    price: "29 900",
    priceNote: "тг/мес",
    badge: "",
    badgeColor: "",
    icon: <Star className="h-5 w-5 text-blue-400" />,
    features: [
      "500 минут звонков",
      "3 пользователя",
      "Базовая аналитика",
      "WhatsApp интеграция",
      "Email поддержка",
    ],
    isCurrent: false,
    isHighlighted: false,
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: "79 900",
    priceNote: "тг/мес",
    badge: "Текущий",
    badgeColor: "border-indigo-500/20 bg-indigo-500/10 text-indigo-400",
    icon: <Crown className="h-5 w-5 text-indigo-400" />,
    features: [
      "2 000 минут звонков",
      "10 пользователей",
      "Расширенная аналитика",
      "Все каналы связи",
      "Приоритетная поддержка",
      "API доступ",
    ],
    isCurrent: true,
    isHighlighted: true,
  },
  {
    id: "max",
    name: "MAX",
    price: "149 900",
    priceNote: "тг/мес",
    badge: "Enterprise",
    badgeColor: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    icon: <Sparkles className="h-5 w-5 text-amber-400" />,
    features: [
      "Безлимит минут",
      "Безлимит пользователей",
      "Custom AI модель",
      "Выделенный менеджер",
      "SLA гарантия",
      "Индивидуальная настройка",
    ],
    isCurrent: false,
    isHighlighted: false,
  },
];

// ── Defaults (used as fallback before API responds) ───────────

const defaultMinutesUsed = 847;
const defaultMinutesLimit = 2000;
const defaultPlan = "PREMIUM";
const defaultPlanStatus = "ACTIVE";

// ── Page ──────────────────────────────────────────────────────────

export default function BillingPage() {
  const [minutesUsed, setMinutesUsed] = useState(defaultMinutesUsed);
  const [minutesLimit, setMinutesLimit] = useState(defaultMinutesLimit);
  const [currentPlan, setCurrentPlan] = useState(defaultPlan);
  const [planStatus, setPlanStatus] = useState(defaultPlanStatus);

  useEffect(() => {
    fetch("/api/billing")
      .then((res) => {
        if (!res.ok) throw new Error("API not available");
        return res.json();
      })
      .then((data) => {
        if (data.minutesUsed !== undefined) setMinutesUsed(data.minutesUsed);
        if (data.minutesLimit !== undefined) setMinutesLimit(data.minutesLimit);
        if (data.plan) setCurrentPlan(data.plan);
        if (data.planStatus) setPlanStatus(data.planStatus);
      })
      .catch(() => {
        // API not available — keep using demo data as fallback
      });
  }, []);

  const usagePercent = minutesLimit > 0 ? Math.round((minutesUsed / minutesLimit) * 100) : 0;
  const planStatusLabel = planStatus === "ACTIVE" ? "Активен" : planStatus === "EXPIRED" ? "Истёк" : "Отменён";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Тарифы и оплата</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Управление подпиской и лимитами
        </p>
      </div>

      {/* Current plan card */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                <CreditCard className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-white">{currentPlan}</CardTitle>
                  <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400">
                    {planStatusLabel}
                  </Badge>
                </div>
                <CardDescription className="text-zinc-400">
                  Ваш текущий тарифный план
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <Separator className="bg-zinc-800" />
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Использовано минут</span>
              <span className="font-medium text-white">
                {minutesUsed} из {minutesLimit.toLocaleString("ru-RU")}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              {usagePercent}% от лимита использовано. Осталось{" "}
              {minutesLimit - minutesUsed} минут до конца периода.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id.toUpperCase() === currentPlan.toUpperCase();
          return (
            <Card
              key={plan.id}
              className={`relative border-zinc-800 bg-zinc-900 ${
                isCurrent
                  ? "ring-2 ring-indigo-500"
                  : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                    {plan.icon}
                  </div>
                  {isCurrent ? (
                    <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                      Текущий
                    </Badge>
                  ) : plan.badge && !plan.isCurrent ? (
                    <Badge className={plan.badgeColor}>{plan.badge}</Badge>
                  ) : null}
                </div>
                <CardTitle className="mt-3 text-lg text-white">
                  {plan.name}
                </CardTitle>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-sm text-zinc-500">{plan.priceNote}</span>
                </div>
              </CardHeader>
              <Separator className="bg-zinc-800" />
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-indigo-400" />
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      className="w-full border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
                      disabled
                    >
                      Текущий план
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-zinc-700 text-zinc-300 hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-white"
                    >
                      Выбрать
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
