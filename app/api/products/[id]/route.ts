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
    const product = await prisma.masterProduct.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assemblyUnits: true,
            stations: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    // Periksa apakah masih ada unit produksi yang sedang aktif berjalan
    const activeUnits = await prisma.assemblyUnit.count({
      where: {
        productId: id,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    })

    if (activeUnits > 0) {
      return NextResponse.json(
        { error: `Tidak dapat menghapus produk. Masih ada ${activeUnits} unit produksi aktif yang sedang berjalan.` },
        { status: 400 }
      )
    }

    // Jika memiliki data historis (unit atau stasiun terhubung), lakukan soft delete agar integritas audit terjaga
    if (product._count.assemblyUnits > 0 || product._count.stations > 0) {
      await prisma.masterProduct.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: 'Produk berhasil dihapus dari daftar aktif.',
      })
    }

    // Jika belum ada relasi sama sekali, hapus secara permanen
    await prisma.masterProduct.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus permanen.',
    })
  } catch (err: any) {
    console.error('DELETE /api/products/[id] error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server saat menghapus produk' },
      { status: 500 }
    )
  }
}
