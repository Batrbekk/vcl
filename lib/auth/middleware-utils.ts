import { NextRequest, NextResponse } from 'next/server'

export function checkAuth(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const isAuthPage = request.nextUrl.pathname === '/'
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard')

  if (!token && isDashboardPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
} 