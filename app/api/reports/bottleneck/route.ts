import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Bottleneck: rata-rata durasi per stasiun
  const bottleneckRaw = await prisma.trackingLog.groupBy({
    by: ['stationId'],
    where: {
      status: 'SUCCESS',
      durationSeconds: { not: null, gt: 0 },
      scannedAt: { gte: since },
    },
    _avg: { durationSeconds: true },
    _count: { id: true },
    _max: { durationSeconds: true },
    _min: { durationSeconds: true },
  })

  // Fetch station names
  const stationIds = bottleneckRaw.map((r) => r.stationId)
  const stations = await prisma.station.findMany({
    where: { id: { in: stationIds } },
    select: { id: true, stationName: true, sequenceOrder: true },
  })

  const stationMap = Object.fromEntries(stations.map((s) => [s.id, s]))

  const bottleneck = bottleneckRaw
    .map((r) => ({
      stationId: r.stationId,
      stationName: stationMap[r.stationId]?.stationName || 'Unknown',
      sequenceOrder: stationMap[r.stationId]?.sequenceOrder || 0,
      avgMinutes: Math.round(((r._avg.durationSeconds || 0) / 60) * 10) / 10,
      maxMinutes: Math.round(((r._max.durationSeconds || 0) / 60) * 10) / 10,
      minMinutes: Math.round(((r._min.durationSeconds || 0) / 60) * 10) / 10,
      totalScans: r._count.id,
    }))
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)

  // Error rate per stasiun
  const errorRates = await prisma.trackingLog.groupBy({
    by: ['stationId', 'status'],
    where: { scannedAt: { gte: since } },
    _count: { id: true },
  })

  const errorMap: Record<string, { success: number; error: number }> = {}
  for (const r of errorRates) {
    if (!errorMap[r.stationId]) errorMap[r.stationId] = { success: 0, error: 0 }
    if (r.status === 'SUCCESS') errorMap[r.stationId].success += r._count.id
    if (r.status === 'ERROR') errorMap[r.stationId].error += r._count.id
  }

  const bottleneckWithErrors = bottleneck.map((b) => ({
    ...b,
    errorRate: errorMap[b.stationId]
      ? Math.round(
          (errorMap[b.stationId].error /
            (errorMap[b.stationId].success + errorMap[b.stationId].error)) *
            100
        )
      : 0,
  }))

  // Throughput harian
  const dailyThroughput = await prisma.trackingLog.groupBy({
    by: ['scannedAt'],
    where: {
      status: 'SUCCESS',
      scannedAt: { gte: since },
    },
    _count: { id: true },
  })

  return NextResponse.json({
    bottleneck: bottleneckWithErrors,
    period: { days, since },
  })
}
