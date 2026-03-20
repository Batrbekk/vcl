import { BotManager } from "@/components/bot/bot-manager";

export default function BotsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">AI-боты</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Управление голосовыми AI-ассистентами
        </p>
      </div>
      <BotManager />
    </div>
  );
}
