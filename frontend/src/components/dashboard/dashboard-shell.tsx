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
      <SidebarProvider>
        <AppSidebar session={session} />
        <SidebarInset className="bg-zinc-950">
          <DashboardHeader session={session} />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
