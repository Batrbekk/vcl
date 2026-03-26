"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Phone, PhoneCall, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export function PhoneCallPanel() {
  const [phone, setPhone] = useState("");
  const [calling, setCalling] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleCall() {
    if (!phone.trim()) return;
    setCalling(true);
    setResult(null);

    try {
      const res = await fetch("/api/calls/originate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: `Звонок на ${phone} инициирован` });
      } else {
        setResult({ success: false, message: data.error || "Ошибка" });
      }
    } catch {
      setResult({ success: false, message: "Не удалось отправить звонок" });
    } finally {
      setCalling(false);
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <PhoneCall className="h-5 w-5 text-indigo-400" />
          Исходящий звонок
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Бот позвонит на указанный номер и проведёт разговор по скрипту
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-zinc-300">Номер телефона</Label>
          <div className="flex gap-3">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+77758221235"
              className="flex-1 border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleCall()}
            />
            <Button
              onClick={handleCall}
              disabled={calling || !phone.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-700 px-6"
            >
              {calling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-1.5" />
                  Позвонить
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Формат: +7XXXXXXXXXX или 8XXXXXXXXXX
          </p>
        </div>

        {result && (
          <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
            result.success
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {result.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
