import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
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
