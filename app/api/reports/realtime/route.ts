import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  // Real-time: unit per stasiun saat ini
  const stationCounts = await prisma.station.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          assemblyUnits: {
            where: { status: 'IN_PROGRESS' },
          },
        },
      },
    },
    orderBy: { sequenceOrder: 'asc' },
  })

  // Summary stats
  const [totalPending, totalInProgress, totalCompleted, totalRejected] = await Promise.all([
    prisma.assemblyUnit.count({ where: { status: 'PENDING' } }),
    prisma.assemblyUnit.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.assemblyUnit.count({ where: { status: 'COMPLETED' } }),
    prisma.assemblyUnit.count({ where: { status: 'REJECTED' } }),
  ])

  // Progress per unit (untuk tabel)
  const units = await prisma.assemblyUnit.findMany({
    where: { status: { in: ['IN_PROGRESS', 'PENDING'] } },
    include: {
      product: { select: { totalStations: true, productName: true } },
      currentStation: { select: { stationName: true, sequenceOrder: true } },
    },
    orderBy: { registeredAt: 'desc' },
    take: 20,
  })

  const unitsWithProgress = units.map((u) => ({
    ...u,
    progressPercent: Math.round((u.currentSequence / u.product.totalStations) * 100),
  }))

  return NextResponse.json({
    stationCounts: stationCounts.map((s) => ({
      id: s.id,
      stationName: s.stationName,
      sequenceOrder: s.sequenceOrder,
      activeUnits: s._count.assemblyUnits,
    })),
    summary: {
      pending: totalPending,
      inProgress: totalInProgress,
      completed: totalCompleted,
      rejected: totalRejected,
      total: totalPending + totalInProgress + totalCompleted + totalRejected,
    },
    activeUnits: unitsWithProgress,
  })
}
