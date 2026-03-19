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
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Дашборд",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Лиды",
    href: "/leads",
    icon: Users,
  },
  {
    title: "Звонки",
    href: "/calls",
    icon: Phone,
  },
  {
    title: "AI-бот",
    href: "/bot",
    icon: Bot,
  },
];

const settingsItems = [
  {
    title: "Интеграции",
    href: "/integrations",
    icon: Plug,
  },
  {
    title: "Команда",
    href: "/team",
    icon: UserPlus,
  },
  {
    title: "Тарифы",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "Настройки",
    href: "/settings",
    icon: Settings,
  },
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
    <Sidebar className="border-zinc-800 bg-zinc-900">
      <SidebarHeader className="px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">VOXI</span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator className="bg-zinc-800" />

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Основное
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    className={
                      isActive(item.href)
                        ? "bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 hover:text-indigo-300"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }
                    render={<Link href={item.href} />}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Управление
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    className={
                      isActive(item.href)
                        ? "bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 hover:text-indigo-300"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }
                    render={<Link href={item.href} />}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3">
        <SidebarSeparator className="mb-3 bg-zinc-800" />
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-zinc-300">
            {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex flex-col overflow-hidden">
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
