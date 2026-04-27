import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default product
  const product = await prisma.masterProduct.upsert({
    where: { productCode: 'PROD-001' },
    update: {},
    create: {
      productCode: 'PROD-001',
      productName: 'Produk Standar A',
      description: 'Produk perakitan utama dengan 5 stasiun',
      totalStations: 5,
    },
  })
  console.log('✅ Product created:', product.productName)

  // Create 5 stations
  const stationsData = [
    { code: 'ST-001', name: 'Stasiun 1 — Persiapan Komponen', order: 1, desc: 'Pemeriksaan dan persiapan semua komponen yang akan dirakit' },
    { code: 'ST-002', name: 'Stasiun 2 — Perakitan Rangka', order: 2, desc: 'Pemasangan rangka utama dan struktur dasar produk' },
    { code: 'ST-003', name: 'Stasiun 3 — Instalasi Elektronik', order: 3, desc: 'Pemasangan komponen elektronik dan wiring' },
    { code: 'ST-004', name: 'Stasiun 4 — Quality Control', order: 4, desc: 'Pemeriksaan kualitas dan pengujian fungsional' },
    { code: 'ST-005', name: 'Stasiun 5 — Finishing & Packaging', order: 5, desc: 'Finishing akhir, pelabelan, dan pengemasan produk' },
  ]

  const stations = []
  for (const s of stationsData) {
    const station = await prisma.station.upsert({
      where: { stationCode: s.code },
      update: {},
      create: {
        stationCode: s.code,
        stationName: s.name,
        sequenceOrder: s.order,
        description: s.desc,
        productId: product.id,
      },
    })
    stations.push(station)
    console.log(`✅ Station created: ${station.stationName}`)
  }

  // Create users
  const adminPass = await bcrypt.hash('admin123', 12)
  const supPass = await bcrypt.hash('supervisor123', 12)
  const opPass = await bcrypt.hash('operator123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@factory.com' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@factory.com',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
  })

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@factory.com' },
    update: {},
    create: {
      name: 'Budi Santoso',
      email: 'supervisor@factory.com',
      passwordHash: supPass,
      role: 'SUPERVISOR',
    },
  })

  const operator1 = await prisma.user.upsert({
    where: { email: 'operator1@factory.com' },
    update: {},
    create: {
      name: 'Andi Pratama',
      email: 'operator1@factory.com',
      passwordHash: opPass,
      role: 'OPERATOR',
    },
  })

  const operator2 = await prisma.user.upsert({
    where: { email: 'operator2@factory.com' },
    update: {},
    create: {
      name: 'Siti Rahayu',
      email: 'operator2@factory.com',
      passwordHash: opPass,
      role: 'OPERATOR',
    },
  })

  console.log('✅ Users created: admin, supervisor, 2 operators')

  // Create sample assembly units with tracking logs
  const unitSerials = [
    'UNIT-2024-001', 'UNIT-2024-002', 'UNIT-2024-003',
    'UNIT-2024-004', 'UNIT-2024-005', 'UNIT-2024-006',
  ]

  for (let i = 0; i < unitSerials.length; i++) {
    const serial = unitSerials[i]
    const completedStations = Math.min(i + 1, 5)
    const isCompleted = completedStations === 5
    const currentStation = isCompleted ? stations[4] : stations[completedStations - 1]

    const unit = await prisma.assemblyUnit.upsert({
      where: { serialNumber: serial },
      update: {},
      create: {
        serialNumber: serial,
        productId: product.id,
        currentStationId: currentStation.id,
        status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
        currentSequence: completedStations,
        registeredById: admin.id,
        registeredAt: new Date(Date.now() - (6 - i) * 3600000),
        completedAt: isCompleted ? new Date() : null,
      },
    })

    // Create tracking logs for each completed station
    for (let j = 0; j < completedStations; j++) {
      const durationSecs = 900 + Math.floor(Math.random() * 1800) // 15-45 min
      await prisma.trackingLog.create({
        data: {
          unitId: unit.id,
          stationId: stations[j].id,
          operatorId: j % 2 === 0 ? operator1.id : operator2.id,
          status: 'SUCCESS',
          durationSeconds: j > 0 ? durationSecs : null,
          scannedAt: new Date(Date.now() - (completedStations - j) * durationSecs * 1000),
        },
      })
    }
    console.log(`✅ Unit created: ${serial} (${completedStations}/5 stations)`)
  }

  console.log('\n🎉 Seed selesai!')
  console.log('📋 Login credentials:')
  console.log('  Admin:      admin@factory.com / admin123')
  console.log('  Supervisor: supervisor@factory.com / supervisor123')
  console.log('  Operator:   operator1@factory.com / operator123')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
