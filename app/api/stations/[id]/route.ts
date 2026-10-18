import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(['ADMIN'])
  if (error) return error

  const { id } = await params

  try {
    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assemblyUnits: true,
            trackingLogs: true,
          },
        },
      },
    })

    if (!station) {
      return NextResponse.json({ error: 'Stasiun tidak ditemukan' }, { status: 404 })
    }

    // Periksa apakah ada unit produksi aktif yang saat ini berada di stasiun ini
    const activeUnits = await prisma.assemblyUnit.count({
      where: {
        currentStationId: id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    })

    if (activeUnits > 0) {
      return NextResponse.json(
        { error: `Tidak dapat menghapus stasiun. Terdapat ${activeUnits} unit produksi aktif di stasiun ini.` },
        { status: 400 }
      )
    }

    // Jika stasiun sudah memiliki riwayat log pemindaian atau riwayat unit, soft-delete
    if (station._count.trackingLogs > 0 || station._count.assemblyUnits > 0) {
      await prisma.station.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: 'Stasiun berhasil dihapus dari lini aktif.',
      })
    }

    // Jika belum pernah digunakan sama sekali, hapus permanen
    await prisma.station.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Stasiun berhasil dihapus permanen.',
    })
  } catch (err: any) {
    console.error('DELETE /api/stations/[id] error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server saat menghapus stasiun' },
      { status: 500 }
    )
  }
}
