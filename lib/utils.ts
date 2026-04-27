import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR'

export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized — silakan login' }, { status: 401 }),
      session: null,
    }
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role as UserRole)) {
    return {
      error: NextResponse.json(
        { error: `Akses ditolak — role ${session.user.role} tidak diizinkan` },
        { status: 403 }
      ),
      session: null,
    }
  }

  return { error: null, session }
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
