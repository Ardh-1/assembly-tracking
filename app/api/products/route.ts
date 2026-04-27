import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const products = await prisma.masterProduct.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { assemblyUnits: true, stations: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ products })
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(['ADMIN'])
  if (error) return error

  try {
    const body = await request.json()
    const { productCode, productName, description, totalStations } = body

    if (!productCode || !productName || !totalStations) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
    }

    const product = await prisma.masterProduct.create({
      data: { productCode, productName, description, totalStations },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Kode produk sudah digunakan' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Gagal membuat produk' }, { status: 500 })
  }
}
