import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  // 1. Beban unit aktif per stasiun
  const stationCounts = await query(
    `SELECT
       s.id,
       s.station_name   AS "stationName",
       s.sequence_order AS "sequenceOrder",
       COUNT(au.id)     AS "activeUnits"
     FROM stations s
       LEFT JOIN assembly_units au
         ON au.current_station_id = s.id AND au.status = 'IN_PROGRESS'
     WHERE s.is_active = true
     GROUP BY s.id
     ORDER BY s.sequence_order ASC`
  )

  // 2. Summary per status — satu query GROUP BY lebih efisien
  const summaryRows = await query(
    `SELECT status, COUNT(*) AS count
     FROM assembly_units
     GROUP BY status`
  )

  const summary = { pending: 0, inProgress: 0, completed: 0, rejected: 0, total: 0 }
  for (const row of summaryRows) {
    const n = parseInt(row.count)
    summary.total += n
    if (row.status === 'PENDING')     summary.pending     = n
    if (row.status === 'IN_PROGRESS') summary.inProgress  = n
    if (row.status === 'COMPLETED')   summary.completed   = n
    if (row.status === 'REJECTED')    summary.rejected    = n
  }

  // 3. Unit aktif untuk tabel (max 20)
  const activeUnits = await query(
    `SELECT
       au.id,
       au.serial_number    AS "serialNumber",
       au.status,
       au.current_sequence AS "currentSequence",
       au.registered_at    AS "registeredAt",
       mp.product_name     AS "productName",
       mp.total_stations   AS "totalStations",
       s.station_name      AS "stationName",
       s.sequence_order    AS "stationSequenceOrder",
       ROUND(au.current_sequence::numeric / mp.total_stations * 100) AS "progressPercent"
     FROM assembly_units au
       JOIN master_products mp ON mp.id = au.product_id
       LEFT JOIN stations   s  ON s.id  = au.current_station_id
     WHERE au.status IN ('IN_PROGRESS', 'PENDING')
     ORDER BY au.registered_at DESC
     LIMIT 20`
  )

  return NextResponse.json({
    stationCounts: stationCounts.map((s) => ({
      id:            s.id,
      stationName:   s.stationName,
      sequenceOrder: s.sequenceOrder,
      activeUnits:   parseInt(s.activeUnits || '0'),
    })),
    summary,
    activeUnits: activeUnits.map((u) => ({
      id:              u.id,
      serialNumber:    u.serialNumber,
      status:          u.status,
      currentSequence: u.currentSequence,
      registeredAt:    u.registeredAt,
      progressPercent: parseInt(u.progressPercent || '0'),
      product:         { productName: u.productName, totalStations: u.totalStations },
      currentStation:  u.stationName ? { stationName: u.stationName, sequenceOrder: u.stationSequenceOrder } : null,
    })),
  })
}
