"use client"

import { User, Settings, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUserStore } from "@/store/user-store"
import { useAuthStore } from "@/store/auth-store"

export function UserNav() {
  const user = useUserStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium">
              {user ? `${user.firstName} ${user.lastName}` : "Загрузка..."}
            </span>
            <span className="text-xs text-muted-foreground">
              {user?.companyName || "Компания"}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" className="w-56">
        <DropdownMenuItem className="hover:!bg-korn/20">
          <User className="mr-2 h-4 w-4" />
          <span>Профиль</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="hover:!bg-korn/20">
          <Settings className="mr-2 h-4 w-4" />
          <span>Настройки</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-destructive hover:!bg-red-500/10" 
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4 text-red-500" />
          <span className="text-red-500">Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 