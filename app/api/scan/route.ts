import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

// POST /api/scan — Core scan endpoint
// Body: { serialNumber: string, stationId: string }
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

    // 1. Cek apakah unit ada
    const unit = await prisma.assemblyUnit.findUnique({
      where: { serialNumber },
      include: {
        product: true,
        currentStation: true,
      },
    })

    if (!unit) {
      return NextResponse.json(
        {
          error: `Unit dengan serial "${serialNumber}" tidak ditemukan di database`,
          success: false,
          code: 'UNIT_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    if (unit.status === 'COMPLETED') {
      return NextResponse.json(
        {
          error: 'Unit ini sudah selesai diproses (COMPLETED)',
          success: false,
          code: 'UNIT_COMPLETED',
          unit,
        },
        { status: 409 }
      )
    }

    if (unit.status === 'REJECTED') {
      return NextResponse.json(
        {
          error: 'Unit ini ditolak (REJECTED) — hubungi supervisor',
          success: false,
          code: 'UNIT_REJECTED',
          unit,
        },
        { status: 409 }
      )
    }

    // 2. Cek apakah stasiun ada
    const targetStation = await prisma.station.findUnique({
      where: { id: stationId },
    })

    if (!targetStation || !targetStation.isActive) {
      return NextResponse.json(
        { error: 'Stasiun tidak ditemukan atau tidak aktif', success: false, code: 'STATION_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 3. VALIDASI URUTAN STASIUN — inti logika bisnis
    const expectedSequence = unit.currentSequence + 1

    if (targetStation.sequenceOrder !== expectedSequence) {
      const direction = targetStation.sequenceOrder < expectedSequence ? 'sudah melewati' : 'belum mencapai'
      const msg =
        expectedSequence === 1
          ? `Unit belum dimulai. Harus dimulai dari Stasiun 1`
          : `Urutan stasiun salah! Unit ${direction} stasiun ini. ` +
            `Stasiun berikutnya yang benar: Urutan ke-${expectedSequence}`

      // Catat sebagai error log
      await prisma.trackingLog.create({
        data: {
          unitId: unit.id,
          stationId: targetStation.id,
          operatorId: session!.user.id,
          status: 'ERROR',
          notes: `Urutan salah: expected ${expectedSequence}, got ${targetStation.sequenceOrder}`,
        },
      })

      return NextResponse.json(
        {
          error: msg,
          success: false,
          code: 'WRONG_SEQUENCE',
          expectedSequence,
          targetSequence: targetStation.sequenceOrder,
          unit,
          targetStation,
        },
        { status: 422 }
      )
    }

    // 4. Hitung durasi di stasiun sebelumnya
    let durationSeconds: number | null = null
    if (unit.currentStation) {
      const lastLog = await prisma.trackingLog.findFirst({
        where: { unitId: unit.id, status: 'SUCCESS' },
        orderBy: { scannedAt: 'desc' },
      })
      if (lastLog) {
        durationSeconds = Math.floor(
          (new Date().getTime() - lastLog.scannedAt.getTime()) / 1000
        )
      }
    }

    // 5. Update assembly unit + create tracking log (transaksi)
    const isLastStation = targetStation.sequenceOrder === unit.product.totalStations

    const [updatedUnit, trackingLog] = await prisma.$transaction([
      prisma.assemblyUnit.update({
        where: { id: unit.id },
        data: {
          currentStationId: targetStation.id,
          currentSequence: targetStation.sequenceOrder,
          status: isLastStation ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: isLastStation ? new Date() : null,
        },
        include: {
          product: true,
          currentStation: true,
        },
      }),
      prisma.trackingLog.create({
        data: {
          unitId: unit.id,
          stationId: targetStation.id,
          operatorId: session!.user.id,
          status: 'SUCCESS',
          durationSeconds,
          notes: isLastStation ? 'Unit selesai diproses' : null,
        },
        include: {
          station: true,
          operator: { select: { name: true } },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: isLastStation
        ? `🎉 Unit ${serialNumber} selesai diproses!`
        : `✅ Unit ${serialNumber} berhasil di-scan di ${targetStation.stationName}`,
      unit: updatedUnit,
      trackingLog,
      isCompleted: isLastStation,
      progress: {
        current: targetStation.sequenceOrder,
        total: unit.product.totalStations,
        percentage: Math.round((targetStation.sequenceOrder / unit.product.totalStations) * 100),
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
