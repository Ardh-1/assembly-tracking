import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params

  // Detail unit + tracking log lengkap (urut dari awal)
  const unit = await queryOne<any>(
    `SELECT
       au.id,
       au.serial_number    AS "serialNumber",
       au.status,
       au.current_sequence AS "currentSequence",
       au.registered_at    AS "registeredAt",
       au.completed_at     AS "completedAt",
       mp.id               AS "productId",
       mp.product_name     AS "productName",
       mp.product_code     AS "productCode",
       mp.total_stations   AS "totalStations",
       mp.description      AS "productDescription",
       s.id                AS "currentStationId",
       s.station_name      AS "currentStationName",
       s.sequence_order    AS "currentStationSequence",
       u.name              AS "registeredByName",
       u.email             AS "registeredByEmail",
       u.role              AS "registeredByRole"
     FROM assembly_units au
       JOIN  master_products mp ON mp.id = au.product_id
       LEFT JOIN stations    s  ON s.id  = au.current_station_id
       LEFT JOIN users       u  ON u.id  = au.registered_by
     WHERE au.id = $1`,
    [id]
  )

  if (!unit) {
    return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })
  }

  // Tracking logs terpisah
  const { query } = await import('@/lib/db')
  const logs = await query(
    `SELECT
       tl.id,
       tl.status,
       tl.scanned_at       AS "scannedAt",
       tl.duration_seconds AS "durationSeconds",
       tl.notes,
       s.id                AS "stationId",
       s.station_name      AS "stationName",
       s.sequence_order    AS "sequenceOrder",
       op.name             AS "operatorName",
       op.role             AS "operatorRole"
     FROM tracking_logs tl
       JOIN stations s  ON s.id  = tl.station_id
       JOIN users    op ON op.id = tl.operator_id
     WHERE tl.unit_id = $1
     ORDER BY tl.scanned_at ASC`,
    [id]
  )

  return NextResponse.json({
    unit: {
      id:              unit.id,
      serialNumber:    unit.serialNumber,
      status:          unit.status,
      currentSequence: unit.currentSequence,
      registeredAt:    unit.registeredAt,
      completedAt:     unit.completedAt,
      product: {
        id:            unit.productId,
        productName:   unit.productName,
        productCode:   unit.productCode,
        totalStations: unit.totalStations,
        description:   unit.productDescription,
      },
      currentStation: unit.currentStationId ? {
        id:            unit.currentStationId,
        stationName:   unit.currentStationName,
        sequenceOrder: unit.currentStationSequence,
      } : null,
      registeredBy: unit.registeredByName ? {
        name:  unit.registeredByName,
        email: unit.registeredByEmail,
        role:  unit.registeredByRole,
      } : null,
      trackingLogs: logs.map((l) => ({
        id:              l.id,
        status:          l.status,
        scannedAt:       l.scannedAt,
        durationSeconds: l.durationSeconds,
        notes:           l.notes,
        station: {
          id:            l.stationId,
          stationName:   l.stationName,
          sequenceOrder: l.sequenceOrder,
        },
        operator: {
          name: l.operatorName,
          role: l.operatorRole,
        },
      })),
    },
  })
}
