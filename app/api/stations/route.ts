import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

// GET /api/stations
export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const stations = await query(
    `SELECT
       s.id,
       s.station_code    AS "stationCode",
       s.station_name    AS "stationName",
       s.sequence_order  AS "sequenceOrder",
       s.description,
       s.is_active       AS "isActive",
       s.created_at      AS "createdAt",
       s.product_id      AS "productId",
       mp.product_name   AS "productName",
       mp.product_code   AS "productCode",
       COUNT(au.id) FILTER (WHERE au.status = 'IN_PROGRESS') AS "activeUnitsCount"
     FROM stations s
       LEFT JOIN master_products mp ON mp.id = s.product_id
       LEFT JOIN assembly_units  au ON au.current_station_id = s.id
     WHERE s.is_active = true
     GROUP BY s.id, mp.product_name, mp.product_code
     ORDER BY s.sequence_order ASC`
  )

  const result = stations.map((s) => ({
    id:            s.id,
    stationCode:   s.stationCode,
    stationName:   s.stationName,
    sequenceOrder: s.sequenceOrder,
    description:   s.description,
    isActive:      s.isActive,
    createdAt:     s.createdAt,
    product:       s.productId ? { productName: s.productName, productCode: s.productCode } : null,
    _count:        { assemblyUnits: parseInt(s.activeUnitsCount || '0') },
  }))

  return NextResponse.json({ stations: result })
}

// POST /api/stations
export async function POST(request: NextRequest) {
  const { error } = await requireAuth(['ADMIN'])
  if (error) return error

  try {
    const body = await request.json()
    const { stationCode, stationName, sequenceOrder, description, productId } = body

    if (!stationCode || !stationName || !sequenceOrder) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
    }

    const station = await queryOne(
      `INSERT INTO stations (id, station_code, station_name, sequence_order, description, product_id, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
       RETURNING
         id,
         station_code   AS "stationCode",
         station_name   AS "stationName",
         sequence_order AS "sequenceOrder",
         description,
         product_id     AS "productId",
         is_active      AS "isActive",
         created_at     AS "createdAt"`,
      [uuidv4(), stationCode, stationName, sequenceOrder, description || null, productId || null]
    )

    return NextResponse.json({ station }, { status: 201 })
  } catch (err: any) {
    if (err.code === '23505') { // unique_violation
      return NextResponse.json({ error: 'Kode stasiun sudah digunakan' }, { status: 409 })
    }
    console.error('POST /api/stations error:', err)
    return NextResponse.json({ error: 'Gagal membuat stasiun' }, { status: 500 })
  }
}
