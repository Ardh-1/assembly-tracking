import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

// GET /api/units — daftar unit dengan filter & pagination
export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status    = searchParams.get('status')
  const productId = searchParams.get('productId')
  const page      = Math.max(1, parseInt(searchParams.get('page')  || '1'))
  const limit     = Math.min(100, parseInt(searchParams.get('limit') || '20'))
  const offset    = (page - 1) * limit

  // Bangun kondisi WHERE dinamis
  const conditions: string[] = []
  const params: any[] = []
  let idx = 1

  if (status) {
    conditions.push(`au.status = $${idx++}`)
    params.push(status)
  }
  if (productId) {
    conditions.push(`au.product_id = $${idx++}`)
    params.push(productId)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Query utama: ambil unit beserta relasi
  const unitsQuery = `
    SELECT
      au.id,
      au.serial_number      AS "serialNumber",
      au.status,
      au.current_sequence   AS "currentSequence",
      au.registered_at      AS "registeredAt",
      au.completed_at       AS "completedAt",
      -- Produk
      mp.id                 AS "productId",
      mp.product_name       AS "productName",
      mp.product_code       AS "productCode",
      mp.total_stations     AS "totalStations",
      -- Stasiun saat ini
      s.id                  AS "currentStationId",
      s.station_name        AS "currentStationName",
      s.sequence_order      AS "currentStationSequence",
      -- Pendaftar
      u.name                AS "registeredByName",
      u.email               AS "registeredByEmail",
      -- Log terakhir
      tl.scanned_at         AS "lastScanAt",
      tl.station_id         AS "lastStationId",
      tl_s.station_name     AS "lastStationName"
    FROM assembly_units au
      JOIN  master_products mp ON mp.id = au.product_id
      LEFT JOIN stations    s  ON s.id  = au.current_station_id
      LEFT JOIN users       u  ON u.id  = au.registered_by
      LEFT JOIN LATERAL (
        SELECT scanned_at, station_id
        FROM tracking_logs
        WHERE unit_id = au.id
        ORDER BY scanned_at DESC
        LIMIT 1
      ) tl ON true
      LEFT JOIN stations tl_s ON tl_s.id = tl.station_id
    ${where}
    ORDER BY au.registered_at DESC
    LIMIT $${idx++} OFFSET $${idx}
  `
  params.push(limit, offset)

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM assembly_units au
    ${where}
  `
  // Untuk count, params tanpa limit & offset
  const countParams = params.slice(0, params.length - 2)

  const [rawUnits, countRows] = await Promise.all([
    query(unitsQuery, params),
    query(countQuery, countParams),
  ])

  const total = parseInt(countRows[0]?.total || '0')

  // Reshape ke format yang kompatibel dengan frontend
  const units = rawUnits.map((r) => ({
    id:              r.id,
    serialNumber:    r.serialNumber,
    status:          r.status,
    currentSequence: r.currentSequence,
    registeredAt:    r.registeredAt,
    completedAt:     r.completedAt,
    product: {
      id:            r.productId,
      productName:   r.productName,
      productCode:   r.productCode,
      totalStations: r.totalStations,
    },
    currentStation: r.currentStationId ? {
      id:            r.currentStationId,
      stationName:   r.currentStationName,
      sequenceOrder: r.currentStationSequence,
    } : null,
    registeredBy: r.registeredByName ? {
      name:  r.registeredByName,
      email: r.registeredByEmail,
    } : null,
    trackingLogs: r.lastScanAt ? [{
      scannedAt: r.lastScanAt,
      station:   { id: r.lastStationId, stationName: r.lastStationName },
    }] : [],
  }))

  return NextResponse.json({ units, total, page, limit, totalPages: Math.ceil(total / limit) })
}

// POST /api/units — daftarkan unit baru
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth(['ADMIN', 'SUPERVISOR'])
  if (error) return error

  try {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId diperlukan' }, { status: 400 })
    }

    // Validasi produk
    const product = await queryOne<{ id: string; product_code: string; product_name: string }>(
      `SELECT id, product_code, product_name FROM master_products WHERE id = $1 AND is_active = true`,
      [productId]
    )
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    // Generate serial number
    const dateStr      = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const uniqueSuffix = uuidv4().slice(0, 6).toUpperCase()
    const serialNumber = `${product.product_code}-${dateStr}-${uniqueSuffix}`

    const unit = await queryOne(
      `INSERT INTO assembly_units (id, serial_number, product_id, status, current_sequence, registered_by, registered_at)
       VALUES ($1, $2, $3, 'PENDING', 0, $4, NOW())
       RETURNING id, serial_number AS "serialNumber", status, current_sequence AS "currentSequence", registered_at AS "registeredAt"`,
      [uuidv4(), serialNumber, productId, session!.user.id]
    )

    return NextResponse.json({
      unit: { ...unit, product: { productName: product.product_name, productCode: product.product_code } },
      message: 'Unit berhasil didaftarkan',
    }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/units error:', err)
    return NextResponse.json({ error: 'Gagal mendaftarkan unit' }, { status: 500 })
  }
}
