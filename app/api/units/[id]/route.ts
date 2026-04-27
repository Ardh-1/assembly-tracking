import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params

  const unit = await prisma.assemblyUnit.findUnique({
    where: { id },
    include: {
      product: true,
      currentStation: true,
      registeredBy: { select: { name: true, email: true, role: true } },
      trackingLogs: {
        orderBy: { scannedAt: 'asc' },
        include: {
          station: true,
          operator: { select: { name: true, role: true } },
        },
      },
    },
  })

  if (!unit) {
    return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ unit })
}
