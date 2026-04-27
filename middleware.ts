import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Definisi akses per role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    '/dashboard',
    '/dashboard/scan',
    '/dashboard/units',
    '/dashboard/stations',
    '/dashboard/products',
    '/dashboard/reports',
    '/api/units',
    '/api/scan',
    '/api/qr',
    '/api/stations',
    '/api/products',
    '/api/reports',
  ],
  SUPERVISOR: [
    '/dashboard',
    '/dashboard/scan',
    '/dashboard/units',
    '/dashboard/reports',
    '/api/units',
    '/api/scan',
    '/api/qr',
    '/api/stations', // read-only (dikontrol di API level)
    '/api/reports',
  ],
  OPERATOR: [
    '/dashboard/scan',
    '/api/scan',
    '/api/qr',
    '/api/units', // read-only (untuk cek serial number)
    '/api/stations', // read-only (untuk list stasiun di scanner)
  ],
}

// Halaman yang hanya boleh diakses ADMIN
const ADMIN_ONLY_PATHS = ['/dashboard/stations', '/dashboard/products', '/api/products']

// Halaman yang boleh diakses ADMIN dan SUPERVISOR (bukan OPERATOR)
const MANAGER_PATHS = ['/dashboard', '/dashboard/units', '/dashboard/reports', '/api/reports']

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const role = token?.role as string | undefined
    const pathname = req.nextUrl.pathname

    if (!role) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Cek halaman ADMIN only
    if (ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p))) {
      if (role !== 'ADMIN') {
        // Redirect ke scan page (yang semua role bisa akses)
        return NextResponse.redirect(new URL('/dashboard/scan', req.url))
      }
    }

    // Cek halaman Manager (ADMIN + SUPERVISOR only)
    if (MANAGER_PATHS.some(p => pathname === p || (p !== '/dashboard' && pathname.startsWith(p)))) {
      if (role === 'OPERATOR') {
        return NextResponse.redirect(new URL('/dashboard/scan', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/units/:path*',
    '/api/scan/:path*',
    '/api/qr/:path*',
    '/api/stations/:path*',
    '/api/products/:path*',
    '/api/reports/:path*',
  ],
}
