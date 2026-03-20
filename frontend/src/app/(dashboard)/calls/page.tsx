import { CallsTable } from "@/components/calls/calls-table";

export default function CallsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Журнал звонков</h2>
        <p className="mt-1 text-sm text-zinc-400">
          История звонков AI-бота, транскрипты и аналитика
        </p>
      </div>

      <CallsTable />
    </div>
  );
}
