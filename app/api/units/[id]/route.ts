import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { id } = await params

  const unit = await prisma.assemblyUnit.findUnique({
    where: { id },
    include: {
      product: true,
      currentStation: true,
      registeredBy: { select: { name: true, email: true, role: true } },
      trackingLogs: {
        orderBy: { scannedAt: 'asc' },
        include: {
          station: true,
          operator: { select: { name: true, role: true } },
        },
      },
    },
  })

  if (!unit) {
    return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ unit })
}

// PATCH /api/units/[id] — update status unit (misal: REJECTED, atau dipulihkan)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth(['ADMIN', 'SUPERVISOR'])
  if (error) return error

  const { id } = await params

  try {
    const body = await request.json()
    const { status, reason } = body

    if (!status || !['REJECTED', 'PENDING', 'IN_PROGRESS'].includes(status)) {
      return NextResponse.json(
        { error: 'Status tidak valid. Pilihan: REJECTED, PENDING, IN_PROGRESS' },
        { status: 400 }
      )
    }

    const unit = await prisma.assemblyUnit.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            stations: { orderBy: { sequenceOrder: 'asc' } },
          },
        },
        currentStation: true,
      },
    })

    if (!unit) {
      return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })
    }

    if (status === 'REJECTED' && unit.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Unit ini sudah berstatus Ditolak (REJECTED)' },
        { status: 400 }
      )
    }

    // Tentukan stasiun referensi untuk pencatatan log tracking
    let targetStationId = unit.currentStationId
    if (!targetStationId && unit.product?.stations?.length) {
      targetStationId = unit.product.stations[0].id
    }
    if (!targetStationId) {
      const anyStation = await prisma.station.findFirst()
      targetStationId = anyStation?.id || null
    }

    const operations: any[] = [
      prisma.assemblyUnit.update({
        where: { id },
        data: {
          status,
          completedAt: null,
        },
        include: {
          product: true,
          currentStation: true,
          registeredBy: { select: { name: true, email: true, role: true } },
          trackingLogs: {
            orderBy: { scannedAt: 'asc' },
            include: {
              station: true,
              operator: { select: { name: true, role: true } },
            },
          },
        },
      }),
    ]

    // Catat ke TrackingLog bila ada stasiun terkait
    if (targetStationId) {
      const isRejection = status === 'REJECTED'
      const noteText = isRejection
        ? `Unit DITOLAK oleh ${session!.user.name}: ${reason?.trim() || 'Tidak ada catatan spesifik'}`
        : `Status unit dipulihkan ke ${status} oleh ${session!.user.name}${reason?.trim() ? `: ${reason.trim()}` : ''}`

      operations.push(
        prisma.trackingLog.create({
          data: {
            unitId: unit.id,
            stationId: targetStationId,
            operatorId: session!.user.id,
            status: isRejection ? 'ERROR' : 'SUCCESS',
            notes: noteText,
          },
        })
      )
    }

    const [updatedUnit] = await prisma.$transaction(operations)

    return NextResponse.json({
      unit: updatedUnit,
      message: status === 'REJECTED' ? 'Unit berhasil ditolak' : 'Status unit berhasil diperbarui',
    })
  } catch (err: any) {
    console.error('PATCH /api/units/[id] error:', err)
    return NextResponse.json({ error: 'Gagal memperbarui status unit' }, { status: 500 })
  }
}
