/**
 * Seed tambahan: menyuntikkan 100 unit produksi dengan berbagai status
 * untuk 3 jenis produk, lengkap dengan tracking log yang konsisten dengan
 * logika bisnis di /api/scan (urutan stasiun, durasi, status akhir).
 *
 * Jalankan: npm run seed:units
 */
import 'dotenv/config'
import { PrismaClient, UnitStatus, ScanStatus } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

const TOTAL_UNITS = 100
const TOTAL_STATIONS = 5

// Distribusi status (total = 100)
const STATUS_PLAN: { status: UnitStatus; count: number }[] = [
  { status: 'PENDING', count: 20 },
  { status: 'IN_PROGRESS', count: 40 },
  { status: 'COMPLETED', count: 30 },
  { status: 'REJECTED', count: 10 },
]

// Rata-rata durasi pengerjaan per stasiun (detik) — stasiun 3 & 4 sengaja lebih lama (bottleneck)
const AVG_DURATION_BY_SEQ: Record<number, number> = { 1: 900, 2: 1500, 3: 2700, 4: 2100, 5: 1200 }

const REJECT_REASONS = [
  'Retak pada rangka utama',
  'Wiring tidak sesuai standar',
  'Gagal uji fungsional',
  'Komponen cacat dari supplier',
  'Goresan pada casing',
  'Baut tidak terpasang sempurna',
]

const PRODUCTS = [
  { productCode: 'PROD-001', productName: 'Produk Standar A', description: 'Produk perakitan utama dengan 5 stasiun' },
  { productCode: 'PROD-002', productName: 'Produk Standar B', description: 'Varian produk B dengan 5 stasiun perakitan' },
  { productCode: 'PROD-003', productName: 'Produk Standar C', description: 'Varian produk C dengan 5 stasiun perakitan' },
]

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const jitterDuration = (seq: number) => {
  const avg = AVG_DURATION_BY_SEQ[seq]
  return Math.max(120, Math.round(avg * (0.6 + Math.random() * 0.8))) // ±40%
}
const DAY = 86_400_000

async function main() {
  console.log('🌱 Menyuntikkan 100 unit produksi...')

  // 1. Produk (3 jenis) — produk yang sudah ada tidak diubah
  const products = []
  for (const p of PRODUCTS) {
    const product = await prisma.masterProduct.upsert({
      where: { productCode: p.productCode },
      update: {},
      create: { ...p, totalStations: TOTAL_STATIONS },
    })
    products.push(product)
  }
  console.log('✅ Produk:', products.map((p) => `${p.productCode} (${p.productName})`).join(', '))

  // 2. Stasiun (dipakai bersama oleh semua produk, sesuai logika /api/scan)
  const stations = await prisma.station.findMany({
    where: { isActive: true },
    orderBy: { sequenceOrder: 'asc' },
  })
  const stationBySeq = new Map<number, (typeof stations)[number]>()
  for (const s of stations) if (!stationBySeq.has(s.sequenceOrder)) stationBySeq.set(s.sequenceOrder, s)
  for (let seq = 1; seq <= TOTAL_STATIONS; seq++) {
    if (!stationBySeq.has(seq)) throw new Error(`Stasiun aktif dengan urutan ${seq} tidak ditemukan. Jalankan "npm run seed" dulu.`)
  }

  // 3. User
  const users = await prisma.user.findMany({ where: { isActive: true } })
  const registrars = users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPERVISOR')
  const operators = users.filter((u) => u.role === 'OPERATOR')
  const supervisors = users.filter((u) => u.role === 'SUPERVISOR' || u.role === 'ADMIN')
  if (!registrars.length || !operators.length) throw new Error('Butuh minimal 1 ADMIN/SUPERVISOR dan 1 OPERATOR aktif.')

  // 4. Generate data
  const statuses = shuffle(STATUS_PLAN.flatMap((s) => Array(s.count).fill(s.status) as UnitStatus[]))
  const now = Date.now()
  const usedSerials = new Set<string>()

  const unitRows: any[] = []
  const logRows: any[] = []
  const summary: Record<string, Record<string, number>> = {}

  for (let i = 0; i < TOTAL_UNITS; i++) {
    const status = statuses[i]
    const product = products[i % products.length]
    const unitId = randomUUID()

    // Tentukan berapa stasiun yang sudah dilalui
    let completedSeq: number
    let registeredAt: number
    switch (status) {
      case 'PENDING':
        completedSeq = 0
        registeredAt = now - rand(10 * 60_000, 3 * DAY)
        break
      case 'IN_PROGRESS':
        completedSeq = rand(1, TOTAL_STATIONS - 1)
        registeredAt = now - rand(4 * 3_600_000, 4 * DAY)
        break
      case 'COMPLETED':
        completedSeq = TOTAL_STATIONS
        registeredAt = now - rand(1 * DAY, 30 * DAY)
        break
      case 'REJECTED':
      default:
        completedSeq = rand(1, TOTAL_STATIONS - 1)
        registeredAt = now - rand(1 * DAY, 20 * DAY)
        break
    }

    // Serial number dengan format yang sama seperti /api/units
    let serialNumber: string
    do {
      const d = new Date(registeredAt).toISOString().slice(0, 10).replace(/-/g, '')
      serialNumber = `${product.productCode}-${d}-${randomUUID().slice(0, 6).toUpperCase()}`
    } while (usedSerials.has(serialNumber))
    usedSerials.add(serialNumber)

    // Tracking log SUCCESS per stasiun yang dilalui
    let cursor = registeredAt + rand(5, 60) * 60_000 // mulai scan 5-60 menit setelah registrasi
    let lastSuccessAt: number | null = null
    for (let seq = 1; seq <= completedSeq; seq++) {
      const station = stationBySeq.get(seq)!
      const operator = pick(operators)

      // Sesekali ada scan salah urutan (ERROR) sebelum scan yang benar
      if (seq > 1 && Math.random() < 0.08) {
        const wrongSeq = Math.random() < 0.5 ? seq - 1 : Math.min(seq + 1, TOTAL_STATIONS)
        if (wrongSeq !== seq) {
          logRows.push({
            id: randomUUID(),
            unitId,
            stationId: stationBySeq.get(wrongSeq)!.id,
            operatorId: operator.id,
            status: 'ERROR' as ScanStatus,
            notes: `Urutan salah: expected ${seq}, got ${wrongSeq}`,
            scannedAt: new Date(cursor - rand(1, 5) * 60_000),
          })
        }
      }

      const durationSeconds: number | null = lastSuccessAt ? Math.round((cursor - lastSuccessAt) / 1000) : null
      const isLast = seq === TOTAL_STATIONS
      logRows.push({
        id: randomUUID(),
        unitId,
        stationId: station.id,
        operatorId: operator.id,
        status: 'SUCCESS' as ScanStatus,
        durationSeconds,
        notes: isLast ? 'Unit selesai diproses' : null,
        scannedAt: new Date(cursor),
      })
      lastSuccessAt = cursor
      cursor += jitterDuration(seq) * 1000
    }

    // Pastikan unit IN_PROGRESS tidak punya log di masa depan
    if (lastSuccessAt && lastSuccessAt > now) {
      const shift = lastSuccessAt - now + rand(5, 30) * 60_000
      registeredAt -= shift
      for (const l of logRows.filter((l) => l.unitId === unitId)) l.scannedAt = new Date(l.scannedAt.getTime() - shift)
      lastSuccessAt -= shift
      cursor -= shift
    }

    // Log penolakan (sama seperti PATCH /api/units/[id])
    if (status === 'REJECTED') {
      const sup = pick(supervisors)
      logRows.push({
        id: randomUUID(),
        unitId,
        stationId: stationBySeq.get(completedSeq)!.id,
        operatorId: sup.id,
        status: 'ERROR' as ScanStatus,
        notes: `Unit DITOLAK oleh ${sup.name}: ${pick(REJECT_REASONS)}`,
        scannedAt: new Date(Math.min((lastSuccessAt ?? registeredAt) + rand(10, 90) * 60_000, now)),
      })
    }

    unitRows.push({
      id: unitId,
      serialNumber,
      productId: product.id,
      currentStationId: completedSeq > 0 ? stationBySeq.get(completedSeq)!.id : null,
      status,
      currentSequence: completedSeq,
      registeredById: pick(registrars).id,
      registeredAt: new Date(registeredAt),
      completedAt: status === 'COMPLETED' && lastSuccessAt ? new Date(lastSuccessAt) : null,
    })

    summary[product.productCode] ??= {}
    summary[product.productCode][status] = (summary[product.productCode][status] ?? 0) + 1
  }

  // 5. Simpan (transaksi)
  await prisma.$transaction([
    prisma.assemblyUnit.createMany({ data: unitRows }),
    prisma.trackingLog.createMany({ data: logRows }),
  ])

  console.log(`✅ ${unitRows.length} unit & ${logRows.length} tracking log berhasil dibuat\n`)
  console.table(summary)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
