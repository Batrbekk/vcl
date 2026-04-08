"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Bell, Save, Lock, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { organizationData } from "@/data/seed";

// ── Notification settings ────────────────────────────────────────

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
}

const notificationSettings: NotificationSetting[] = [
  {
    id: "new_lead",
    label: "Новый лид",
    description: "Уведомлять при появлении нового лида в системе",
    defaultOn: true,
  },
  {
    id: "call_completed",
    label: "Завершённый звонок",
    description: "Уведомлять по окончании каждого звонка AI-бота",
    defaultOn: true,
  },
  {
    id: "incoming_message",
    label: "Входящее сообщение",
    description: "Уведомлять о новых сообщениях в WhatsApp/Instagram",
    defaultOn: true,
  },
  {
    id: "missed_call",
    label: "Неотвеченный звонок",
    description: "Уведомлять о пропущенных и неотвеченных звонках",
    defaultOn: true,
  },
  {
    id: "daily_report",
    label: "Ежедневный отчёт",
    description: "Сводка активности за день на email",
    defaultOn: false,
  },
  {
    id: "weekly_report",
    label: "Еженедельный отчёт",
    description: "Аналитический отчёт за неделю на email",
    defaultOn: true,
  },
];

// ── Page ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Organization form state
  const [companyName, setCompanyName] = useState(organizationData.name);
  const [industry, setIndustry] = useState(organizationData.industry);
  const [phone, setPhone] = useState(organizationData.phone);
  const [slug, setSlug] = useState(organizationData.slug);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState("");
  const [orgSuccess, setOrgSuccess] = useState("");

  // Fetch organization data on mount
  const fetchOrganization = useCallback(async () => {
    try {
      const res = await fetch("/api/organization");
      if (res.ok) {
        const data = await res.json();
        setCompanyName(data.name || "");
        setIndustry(data.industry || "");
        setPhone(data.phone || "");
        setSlug(data.slug || "");
      }
    } catch {
      // Fallback to seed data (already set as defaults)
    }
  }, []);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  // Notification toggles state
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        notificationSettings.map((n) => [n.id, n.defaultOn])
      )
  );
  const [notifEmail, setNotifEmail] = useState("almat@nurbolinvest.kz");
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState("");

  const toggleNotification = (id: string) => {
    setNotifications((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Security form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Organization save handler
  const handleOrgSave = async () => {
    setOrgError("");
    setOrgSuccess("");

    if (!companyName.trim()) {
      setOrgError("Название компании не может быть пустым");
      return;
    }

    setOrgLoading(true);
    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName.trim(),
          industry: industry.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка при сохранении");
      }
      setOrgSuccess("Настройки организации сохранены");
      // Update local state with server response
      if (data.name) setCompanyName(data.name);
      if (data.industry !== undefined) setIndustry(data.industry || "");
      if (data.phone !== undefined) setPhone(data.phone || "");
      if (data.slug) setSlug(data.slug);
      setTimeout(() => setOrgSuccess(""), 4000);
    } catch (err: unknown) {
      setOrgError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setOrgLoading(false);
    }
  };

  // Notification save handler
  const handleNotifSave = async () => {
    setNotifSuccess("");
    setNotifLoading(true);
    // Simulate save (notification preferences not yet in DB)
    await new Promise((resolve) => setTimeout(resolve, 500));
    setNotifLoading(false);
    setNotifSuccess("Настройки уведомлений сохранены");
    setTimeout(() => setNotifSuccess(""), 4000);
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Введите текущий пароль");
      return;
    }
    if (!newPassword) {
      setPasswordError("Введите новый пароль");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Новый пароль должен содержать минимум 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка при смене пароля");
      }
      setPasswordSuccess("Пароль успешно изменён");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Настройки</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Параметры организации и уведомлений
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={0}>
        <TabsList className="h-9 border border-zinc-800 bg-zinc-900">
          <TabsTrigger value={0} className="gap-1.5 text-zinc-400 data-active:bg-zinc-800 data-active:text-white">
            <Building2 className="h-4 w-4" />
            Организация
          </TabsTrigger>
          <TabsTrigger value={1} className="gap-1.5 text-zinc-400 data-active:bg-zinc-800 data-active:text-white">
            <Bell className="h-4 w-4" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value={2} className="gap-1.5 text-zinc-400 data-active:bg-zinc-800 data-active:text-white">
            <ShieldCheck className="h-4 w-4" />
            Безопасность
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Organization ──────────────────────────────────── */}
        <TabsContent value={0}>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white">
                Данные организации
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Основная информация о вашей компании
              </CardDescription>
            </CardHeader>
            <Separator className="bg-zinc-800" />
            <CardContent>
              <div className="grid max-w-xl gap-6">
                {/* Company name */}
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-zinc-300">
                    Название компании
                  </Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Industry */}
                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-zinc-300">
                    Отрасль
                  </Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-zinc-300">
                    Телефон
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Slug (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-zinc-300">
                    Slug
                  </Label>
                  <div className="relative">
                    <Input
                      id="slug"
                      value={slug}
                      readOnly
                      className="border-zinc-700 bg-zinc-800/50 pr-10 text-zinc-500"
                    />
                    <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  </div>
                  <p className="text-xs text-zinc-500">
                    Slug используется в URL и не может быть изменён
                  </p>
                </div>

                {/* Error / Success messages */}
                {orgError && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {orgError}
                  </p>
                )}
                {orgSuccess && (
                  <p className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {orgSuccess}
                  </p>
                )}

                {/* Save button */}
                <div className="pt-2">
                  <Button
                    onClick={handleOrgSave}
                    disabled={orgLoading}
                    className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    {orgLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Сохранить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Notifications ─────────────────────────────────── */}
        <TabsContent value={1}>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white">
                Настройки уведомлений
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Выберите, о каких событиях вы хотите получать уведомления
              </CardDescription>
            </CardHeader>
            <Separator className="bg-zinc-800" />
            <CardContent>
              <div className="space-y-6">
                {/* Notification toggles */}
                <div className="space-y-4">
                  {notificationSettings.map((setting) => (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 p-4"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-white">
                          {setting.label}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {setting.description}
                        </p>
                      </div>
                      <Switch
                        checked={notifications[setting.id]}
                        onCheckedChange={() => toggleNotification(setting.id)}
                      />
                    </div>
                  ))}
                </div>

                <Separator className="bg-zinc-800" />

                {/* Notification email */}
                <div className="max-w-md space-y-2">
                  <Label htmlFor="notif-email" className="text-zinc-300">
                    Email для уведомлений
                  </Label>
                  <Input
                    id="notif-email"
                    type="email"
                    value={notifEmail}
                    onChange={(e) => setNotifEmail(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                  />
                  <p className="text-xs text-zinc-500">
                    Все уведомления будут отправлены на этот адрес
                  </p>
                </div>

                {/* Success message */}
                {notifSuccess && (
                  <p className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {notifSuccess}
                  </p>
                )}

                {/* Save button */}
                <div className="pt-2">
                  <Button
                    onClick={handleNotifSave}
                    disabled={notifLoading}
                    className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    {notifLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Сохранить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Security ────────────────────────────────────── */}
        <TabsContent value={2}>
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-white">
                Безопасность
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Изменение пароля учётной записи
              </CardDescription>
            </CardHeader>
            <Separator className="bg-zinc-800" />
            <CardContent>
              <div className="grid max-w-xl gap-6">
                {/* Current password */}
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-zinc-300">
                    Текущий пароль
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Введите текущий пароль"
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* New password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-zinc-300">
                    Новый пароль
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Confirm new password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-zinc-300">
                    Подтвердите новый пароль
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите новый пароль"
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Error / Success messages */}
                {passwordError && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {passwordError}
                  </p>
                )}
                {passwordSuccess && (
                  <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    {passwordSuccess}
                  </p>
                )}

                {/* Submit button */}
                <div className="pt-2">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={passwordLoading}
                    className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    {passwordLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    Изменить пароль
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
