import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

// GET /api/units — list semua unit dengan filter
export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const productId = searchParams.get('productId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = {}
  if (status) where.status = status
  if (productId) where.productId = productId

  const [units, total] = await Promise.all([
    prisma.assemblyUnit.findMany({
      where,
      include: {
        product: true,
        currentStation: true,
        registeredBy: { select: { name: true, email: true } },
        trackingLogs: {
          orderBy: { scannedAt: 'desc' },
          take: 1,
          include: { station: true },
        },
      },
      orderBy: { registeredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.assemblyUnit.count({ where }),
  ])

  return NextResponse.json({ units, total, page, limit, totalPages: Math.ceil(total / limit) })
}

// POST /api/units — register unit baru
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth(['ADMIN', 'SUPERVISOR'])
  if (error) return error

  try {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId diperlukan' }, { status: 400 })
    }

    const product = await prisma.masterProduct.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    // Generate unique serial number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const uniqueSuffix = uuidv4().slice(0, 6).toUpperCase()
    const serialNumber = `${product.productCode}-${dateStr}-${uniqueSuffix}`

    const unit = await prisma.assemblyUnit.create({
      data: {
        serialNumber,
        productId,
        status: 'PENDING',
        currentSequence: 0,
        registeredById: session!.user.id,
      },
      include: {
        product: true,
      },
    })

    return NextResponse.json({ unit, message: 'Unit berhasil didaftarkan' }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/units error:', err)
    return NextResponse.json({ error: 'Gagal mendaftarkan unit' }, { status: 500 })
  }
}
