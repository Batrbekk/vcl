import type { NextRequest } from 'next/server'
import { checkAuth } from '@/lib/auth/middleware-utils'

export function middleware(request: NextRequest) {
  return checkAuth(request)
}

export const config = {
  matcher: ['/', '/dashboard/:path*']
} 