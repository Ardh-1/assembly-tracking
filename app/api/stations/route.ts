import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const stations = await prisma.station.findMany({
    where: { isActive: true },
    include: {
      product: { select: { productName: true, productCode: true } },
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

  return NextResponse.json({ stations })
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth(['ADMIN'])
  if (error) return error

  try {
    const body = await request.json()
    const { stationCode, stationName, sequenceOrder, description, productId } = body

    if (!stationCode || !stationName || !sequenceOrder) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
    }

    const station = await prisma.station.create({
      data: { stationCode, stationName, sequenceOrder, description, productId },
    })

    return NextResponse.json({ station }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Kode stasiun sudah digunakan' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Gagal membuat stasiun' }, { status: 500 })
  }
}
