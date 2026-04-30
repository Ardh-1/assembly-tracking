import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

// GET /api/products
export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const products = await query(
    `SELECT
       mp.id,
       mp.product_code    AS "productCode",
       mp.product_name    AS "productName",
       mp.description,
       mp.total_stations  AS "totalStations",
       mp.is_active       AS "isActive",
       mp.created_at      AS "createdAt",
       COUNT(DISTINCT au.id) AS "assemblyUnitsCount",
       COUNT(DISTINCT s.id)  AS "stationsCount"
     FROM master_products mp
       LEFT JOIN assembly_units au ON au.product_id = mp.id
       LEFT JOIN stations        s  ON s.product_id  = mp.id
     WHERE mp.is_active = true
     GROUP BY mp.id
     ORDER BY mp.created_at DESC`
  )

  const result = products.map((p) => ({
    id:            p.id,
    productCode:   p.productCode,
    productName:   p.productName,
    description:   p.description,
    totalStations: p.totalStations,
    isActive:      p.isActive,
    createdAt:     p.createdAt,
    _count: {
      assemblyUnits: parseInt(p.assemblyUnitsCount || '0'),
      stations:      parseInt(p.stationsCount || '0'),
    },
  }))

  return NextResponse.json({ products: result })
}

// POST /api/products
export async function POST(request: NextRequest) {
  const { error } = await requireAuth(['ADMIN'])
  if (error) return error

  try {
    const body = await request.json()
    const { productCode, productName, description, totalStations } = body

    if (!productCode || !productName || !totalStations) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
    }

    const product = await queryOne(
      `INSERT INTO master_products (id, product_code, product_name, description, total_stations, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING
         id,
         product_code   AS "productCode",
         product_name   AS "productName",
         description,
         total_stations AS "totalStations",
         is_active      AS "isActive",
         created_at     AS "createdAt"`,
      [uuidv4(), productCode, productName, description || null, totalStations]
    )

    return NextResponse.json({ product }, { status: 201 })
  } catch (err: any) {
    if (err.code === '23505') { // unique_violation
      return NextResponse.json({ error: 'Kode produk sudah digunakan' }, { status: 409 })
    }
    console.error('POST /api/products error:', err)
    return NextResponse.json({ error: 'Gagal membuat produk' }, { status: 500 })
  }
}
