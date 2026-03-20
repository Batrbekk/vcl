"use client";

import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

interface DashboardShellProps {
  session: Session;
  children: React.ReactNode;
}

export function DashboardShell({ session, children }: DashboardShellProps) {
  return (
    <SessionProvider session={session}>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar session={session} />
        <SidebarInset className="bg-zinc-950 overflow-hidden min-w-0">
          <DashboardHeader session={session} />
          <div className="flex-1 overflow-auto p-6 min-h-0 min-w-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
