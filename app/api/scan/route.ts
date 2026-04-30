import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, transaction } from '@/lib/db'
import { requireAuth } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

// POST /api/scan — Core scan endpoint
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth(['ADMIN', 'SUPERVISOR', 'OPERATOR'])
  if (error) return error

  try {
    const body = await request.json()
    const { serialNumber, stationId } = body

    if (!serialNumber || !stationId) {
      return NextResponse.json(
        { error: 'serialNumber dan stationId diperlukan', success: false },
        { status: 400 }
      )
    }

    // 1. Cek unit ada
    const unit = await queryOne<any>(
      `SELECT
         au.id,
         au.serial_number    AS "serialNumber",
         au.status,
         au.current_sequence AS "currentSequence",
         au.current_station_id AS "currentStationId",
         au.product_id       AS "productId",
         mp.total_stations   AS "totalStations",
         mp.product_name     AS "productName"
       FROM assembly_units au
         JOIN master_products mp ON mp.id = au.product_id
       WHERE au.serial_number = $1`,
      [serialNumber]
    )

    if (!unit) {
      return NextResponse.json(
        { error: `Unit dengan serial "${serialNumber}" tidak ditemukan`, success: false, code: 'UNIT_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (unit.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Unit ini sudah selesai diproses (COMPLETED)', success: false, code: 'UNIT_COMPLETED', unit },
        { status: 409 }
      )
    }

    if (unit.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Unit ini ditolak (REJECTED) — hubungi supervisor', success: false, code: 'UNIT_REJECTED', unit },
        { status: 409 }
      )
    }

    // 2. Cek stasiun tujuan
    const targetStation = await queryOne<any>(
      `SELECT id, station_name AS "stationName", sequence_order AS "sequenceOrder", is_active AS "isActive"
       FROM stations
       WHERE id = $1`,
      [stationId]
    )

    if (!targetStation || !targetStation.isActive) {
      return NextResponse.json(
        { error: 'Stasiun tidak ditemukan atau tidak aktif', success: false, code: 'STATION_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 3. Validasi urutan stasiun
    const expectedSequence = unit.currentSequence + 1

    if (targetStation.sequenceOrder !== expectedSequence) {
      const direction = targetStation.sequenceOrder < expectedSequence ? 'sudah melewati' : 'belum mencapai'
      const msg =
        expectedSequence === 1
          ? `Unit belum dimulai. Harus dimulai dari Stasiun 1`
          : `Urutan stasiun salah! Unit ${direction} stasiun ini. ` +
            `Stasiun berikutnya yang benar: Urutan ke-${expectedSequence}`

      // Catat error log
      await query(
        `INSERT INTO tracking_logs (id, unit_id, station_id, operator_id, status, notes, scanned_at)
         VALUES ($1, $2, $3, $4, 'ERROR', $5, NOW())`,
        [
          uuidv4(), unit.id, targetStation.id, session!.user.id,
          `Urutan salah: expected ${expectedSequence}, got ${targetStation.sequenceOrder}`,
        ]
      )

      return NextResponse.json(
        { error: msg, success: false, code: 'WRONG_SEQUENCE', expectedSequence, targetSequence: targetStation.sequenceOrder, unit, targetStation },
        { status: 422 }
      )
    }

    // 4. Hitung durasi dari scan terakhir
    let durationSeconds: number | null = null
    if (unit.currentStationId) {
      const lastLog = await queryOne<{ scanned_at: Date }>(
        `SELECT scanned_at FROM tracking_logs
         WHERE unit_id = $1 AND status = 'SUCCESS'
         ORDER BY scanned_at DESC
         LIMIT 1`,
        [unit.id]
      )
      if (lastLog) {
        durationSeconds = Math.floor((Date.now() - new Date(lastLog.scanned_at).getTime()) / 1000)
      }
    }

    // 5. Transaksi: UPDATE unit + INSERT tracking log
    const isLastStation = targetStation.sequenceOrder === unit.totalStations
    const newStatus     = isLastStation ? 'COMPLETED' : 'IN_PROGRESS'
    const logId         = uuidv4()

    const updatedUnit = await transaction(async (client) => {
      // UPDATE assembly_units
      await client.query(
        `UPDATE assembly_units
         SET current_station_id = $1,
             current_sequence   = $2,
             status             = $3,
             completed_at       = $4
         WHERE id = $5`,
        [
          targetStation.id,
          targetStation.sequenceOrder,
          newStatus,
          isLastStation ? new Date() : null,
          unit.id,
        ]
      )

      // INSERT tracking log
      await client.query(
        `INSERT INTO tracking_logs (id, unit_id, station_id, operator_id, status, duration_seconds, notes, scanned_at)
         VALUES ($1, $2, $3, $4, 'SUCCESS', $5, $6, NOW())`,
        [
          logId, unit.id, targetStation.id, session!.user.id,
          durationSeconds,
          isLastStation ? 'Unit selesai diproses' : null,
        ]
      )

      // Return updated unit
      const rows = await client.query(
        `SELECT
           au.id, au.serial_number AS "serialNumber", au.status,
           au.current_sequence AS "currentSequence",
           s.station_name AS "currentStationName",
           mp.total_stations AS "totalStations", mp.product_name AS "productName"
         FROM assembly_units au
           JOIN master_products mp ON mp.id = au.product_id
           LEFT JOIN stations s ON s.id = au.current_station_id
         WHERE au.id = $1`,
        [unit.id]
      )
      return rows.rows[0]
    })

    return NextResponse.json({
      success: true,
      message: isLastStation
        ? `Unit ${serialNumber} selesai diproses!`
        : `Unit ${serialNumber} berhasil di-scan di ${targetStation.stationName}`,
      unit: updatedUnit,
      isCompleted: isLastStation,
      progress: {
        current:    targetStation.sequenceOrder,
        total:      unit.totalStations,
        percentage: Math.round((targetStation.sequenceOrder / unit.totalStations) * 100),
      },
    })
  } catch (err: any) {
    console.error('POST /api/scan error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server', success: false },
      { status: 500 }
    )
  }
}
