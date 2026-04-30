import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const days  = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '7')))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // 1. Rata-rata durasi per stasiun (bottleneck analysis)
  const bottleneckRows = await query(
    `SELECT
       tl.station_id                            AS "stationId",
       s.station_name                           AS "stationName",
       s.sequence_order                         AS "sequenceOrder",
       ROUND(AVG(tl.duration_seconds) / 60.0, 1) AS "avgMinutes",
       ROUND(MAX(tl.duration_seconds) / 60.0, 1) AS "maxMinutes",
       ROUND(MIN(tl.duration_seconds) / 60.0, 1) AS "minMinutes",
       COUNT(*)                                   AS "totalScans"
     FROM tracking_logs tl
       JOIN stations s ON s.id = tl.station_id
     WHERE
       tl.status = 'SUCCESS'
       AND tl.duration_seconds IS NOT NULL
       AND tl.duration_seconds > 0
       AND tl.scanned_at >= $1
     GROUP BY tl.station_id, s.station_name, s.sequence_order
     ORDER BY s.sequence_order ASC`,
    [since]
  )

  // 2. Error rate per stasiun — satu query dengan FILTER
  const errorRateRows = await query(
    `SELECT
       station_id                                     AS "stationId",
       COUNT(*) FILTER (WHERE status = 'SUCCESS')     AS "successCount",
       COUNT(*) FILTER (WHERE status = 'ERROR')       AS "errorCount"
     FROM tracking_logs
     WHERE scanned_at >= $1
     GROUP BY station_id`,
    [since]
  )

  // Buat map stationId → errorRate
  const errorMap: Record<string, number> = {}
  for (const r of errorRateRows) {
    const success = parseInt(r.successCount || '0')
    const errors  = parseInt(r.errorCount   || '0')
    const total   = success + errors
    errorMap[r.stationId] = total > 0 ? Math.round((errors / total) * 100) : 0
  }

  const bottleneck = bottleneckRows.map((r) => ({
    stationId:     r.stationId,
    stationName:   r.stationName,
    sequenceOrder: r.sequenceOrder,
    avgMinutes:    parseFloat(r.avgMinutes || '0'),
    maxMinutes:    parseFloat(r.maxMinutes || '0'),
    minMinutes:    parseFloat(r.minMinutes || '0'),
    totalScans:    parseInt(r.totalScans   || '0'),
    errorRate:     errorMap[r.stationId] ?? 0,
  }))

  return NextResponse.json({
    bottleneck,
    period: { days, since },
  })
}
