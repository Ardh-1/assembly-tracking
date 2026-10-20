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

  // Unit aktif (untuk tabel): 10 unit yang terakhir berubah.
  // "Terakhir berubah" = waktu tracking log terbaru (scan / tolak / pulihkan),
  // atau waktu registrasi bila unit belum punya log.
  const latest = await prisma.$queryRaw<{ id: string; last_activity: Date }[]>`
    SELECT u.id,
           GREATEST(u.registered_at, COALESCE(MAX(t.scanned_at), u.registered_at)) AS last_activity
    FROM assembly_units u
    LEFT JOIN tracking_logs t ON t.unit_id = u.id
    WHERE u.status IN ('IN_PROGRESS', 'PENDING')
    GROUP BY u.id
    ORDER BY last_activity DESC
    LIMIT 10
  `
  const lastActivityById = new Map(latest.map((r) => [r.id, r.last_activity]))

  const units = await prisma.assemblyUnit.findMany({
    where: { id: { in: latest.map((r) => r.id) } },
    include: {
      product: { select: { totalStations: true, productName: true } },
      currentStation: { select: { stationName: true, sequenceOrder: true } },
    },
  })

  const unitsWithProgress = units
    .map((u) => ({
      ...u,
      lastActivityAt: lastActivityById.get(u.id) ?? u.registeredAt,
      progressPercent: Math.round((u.currentSequence / u.product.totalStations) * 100),
    }))
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())

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
