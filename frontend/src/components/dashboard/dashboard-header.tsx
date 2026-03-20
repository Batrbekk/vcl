"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { type Session } from "next-auth";
import { LogOut, User, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageTitles: Record<string, string> = {
  "/": "Дашборд",
  "/leads": "Лиды",
  "/calls": "Звонки",
  "/bot": "AI-боты",
  "/integrations": "Интеграции",
  "/team": "Команда",
  "/billing": "Тарифы",
  "/settings": "Настройки",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Check for sub-paths
  for (const [path, title] of Object.entries(pageTitles)) {
    if (path !== "/" && pathname.startsWith(path)) return title;
  }
  return "Dashboard";
}

interface DashboardHeaderProps {
  session: Session;
}

export function DashboardHeader({ session }: DashboardHeaderProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const userInitials =
    session.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-zinc-800 bg-zinc-950 px-6">
      <SidebarTrigger className="text-zinc-400 hover:text-zinc-200" />
      <Separator orientation="vertical" className="h-5 bg-zinc-800" />

      <h1 className="text-lg font-semibold text-white">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-4">
        <span className="hidden text-sm text-zinc-400 md:block">
          {(session.user as any)?.organizationName || ""}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-600">
            <Avatar size="sm">
              <AvatarFallback className="bg-indigo-600 text-xs text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-zinc-300 md:block">
              {session.user?.name || "Пользователь"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-zinc-200">
                    {session.user?.name || "Пользователь"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {session.user?.email || ""}
                  </p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                window.location.href = "/settings";
              }}
            >
              <User className="mr-2 h-4 w-4" />
              Профиль
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                signOut({ redirectTo: "/login" })
              }
              className="text-red-400 focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
