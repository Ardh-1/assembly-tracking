import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  const { error } = await requireAuth()
  if (error) return error

  const { serial } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'png' // png | svg | base64

  // Verify unit exists
  const unit = await prisma.assemblyUnit.findUnique({
    where: { serialNumber: serial },
    include: { product: true },
  })

  if (!unit) {
    return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })
  }

  // QR content berisi JSON dengan info unit
  const qrContent = JSON.stringify({
    sn: unit.serialNumber,
    pid: unit.productId,
    uid: unit.id,
  })

  if (format === 'svg') {
    const svg = await QRCode.toString(qrContent, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
    })
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'image/svg+xml' },
    })
  }

  if (format === 'base64') {
    const dataUrl = await QRCode.toDataURL(qrContent, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
    })
    return NextResponse.json({ dataUrl, serialNumber: serial })
  }

  // Default: PNG buffer
  const buffer = await QRCode.toBuffer(qrContent, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="qr-${serial}.png"`,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
