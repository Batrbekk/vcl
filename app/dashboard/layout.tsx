"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  BookOpen, 
  Bot, 
  Settings, 
  HelpCircle
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider
} from "@/components/ui/sidebar"
import { UserNav } from "@/components/dashboard/user-nav"
import { useAuthStore } from "@/store/auth-store"
import { useUserStore } from "@/store/user-store"

const sidebarItems = [
  {
    group: "main",
    items: [
      {
        title: "Сделки",
        href: "/dashboard",
        icon: LayoutDashboard
      },
      {
        title: "Менеджера",
        href: "/dashboard/managers",
        icon: Users
      },
      {
        title: "Агенты",
        href: "/dashboard/agents",
        icon: Bot
      },
      {
        title: "История звонков",
        href: "/dashboard/history",
        icon: Phone
      },
      {
        title: "База знаний",
        href: "/dashboard/knowledge",
        icon: BookOpen
      },
      {
        title: "Номера телефонов",
        href: "/dashboard/phone-numbers",
        icon: Phone
      }
    ]
  },
  {
    group: "support",
    items: [
      {
        title: "Настройки",
        href: "/dashboard/settings",
        icon: Settings
      },
      {
        title: "Служба поддержки",
        href: "/dashboard/support",
        icon: HelpCircle
      }
    ]
  }
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const token = useAuthStore((state) => state.token)
  const fetchUser = useUserStore((state) => state.fetchUser)

  useEffect(() => {
    if (token) {
      fetchUser()
    }
  }, [token, fetchUser])

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="flex flex-row h-16 items-center justify-between border-b px-6">
            <div className="flex items-center gap-2">
              <Image src="/dark-logo.svg" alt="Logo" width={64} height={64} />
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-4 py-2">
            <nav className="space-y-2">
              {sidebarItems.map((group, groupIndex) => (
                <div key={group.group} className="space-y-2">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                          "text-foreground",
                          isActive ? "bg-korn/20 text-korn font-medium" : "hover:bg-korn/20"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    )
                  })}
                  {groupIndex < sidebarItems.length - 1 && (
                    <div className="h-px bg-border my-2" />
                  )}
                </div>
              ))}
            </nav>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <UserNav />
          </SidebarFooter>
        </Sidebar>

        {/* Main content */}
        <main className="relative overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
} 