"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Session } from "next-auth";
import {
  LayoutDashboard,
  Users,
  Phone,
  Bot,
  Plug,
  UserPlus,
  CreditCard,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Дашборд", href: "/", icon: LayoutDashboard },
  { title: "Лиды", href: "/leads", icon: Users },
  { title: "Звонки", href: "/calls", icon: Phone },
  { title: "AI-боты", href: "/bot", icon: Bot },
];

const settingsItems = [
  { title: "Интеграции", href: "/integrations", icon: Plug },
  { title: "Команда", href: "/team", icon: UserPlus },
  // { title: "Тарифы", href: "/billing", icon: CreditCard },
  { title: "Настройки", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  session: Session;
}

export function AppSidebar({ session }: AppSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-none bg-zinc-950 [&_[data-slot=sidebar-inner]]:rounded-r-2xl [&_[data-slot=sidebar-inner]]:bg-zinc-900/50"
    >
      {/* Logo */}
      <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo-icon.svg" alt="VOXI" className="h-7 w-7 shrink-0" />
          <span className="text-lg font-bold text-white group-data-[collapsible=icon]:hidden">
            VOXI
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2">
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 group-data-[collapsible=icon]:hidden">
            Основное
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    className={
                      isActive(item.href)
                        ? "bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600/20 hover:text-indigo-300"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }
                    render={<Link href={item.href} />}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings nav */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 group-data-[collapsible=icon]:hidden">
            Управление
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    className={
                      isActive(item.href)
                        ? "bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600/20 hover:text-indigo-300"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }
                    render={<Link href={item.href} />}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — user */}
      <SidebarFooter className="px-4 py-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
            {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium text-zinc-200">
              {session.user?.name || "Пользователь"}
            </span>
            <span className="truncate text-xs text-zinc-500">
              {(session.user as any)?.organizationName || "Организация"}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
