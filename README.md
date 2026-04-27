# AssemblyTrack — System Pelacakan Lini Perakitan

Sistem pelacakan lini perakitan (Assembly Line Tracking) berbasis web menggunakan QR Code sebagai trigger utama status produksi.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 6
- **Auth**: NextAuth.js v4 (JWT + Credentials)
- **Scanner**: html5-qrcode
- **QR Generator**: qrcode npm
- **State**: TanStack Query v5
- **Styling**: Vanilla CSS (dark mode)
- **Deploy**: Vercel

## Fitur

- 📷 Scanner QR Code berbasis kamera (mobile-first) + input manual
- ✅ Validasi urutan stasiun (tidak bisa skip stasiun)
- 📊 Dashboard real-time: beban per stasiun, unit aktif
- ⚠️ Bottleneck analysis: rata-rata waktu & error rate per stasiun
- 👥 Role-based access: Admin / Supervisor / Operator
- 📥 QR Code generator per unit (PNG / SVG)
- 📋 Timeline tracking per unit produksi
- 📈 Progress bar per unit (persentase penyelesaian)

## Quick Start

### 1. Clone & Install

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Isi DATABASE_URL, DIRECT_URL dari Supabase
# Generate NEXTAUTH_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Setup Database

```bash
npx prisma db push    # Buat tabel di Supabase
npx prisma db seed    # Isi data awal (5 stasiun, users, sample units)
```

### 4. Jalankan

```bash
npm run dev
# http://localhost:3000
```

## Login Demo

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@factory.com | admin123 |
| Supervisor | supervisor@factory.com | supervisor123 |
| Operator | operator1@factory.com | operator123 |

## Deployment ke Vercel

1. Push ke GitHub
2. Import di [vercel.com](https://vercel.com)
3. Set environment variables (DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
4. Deploy

Lihat panduan lengkap di [walkthrough.md](walkthrough.md).

## API Endpoints

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/scan` | Scan QR + validasi urutan stasiun |
| GET | `/api/qr/[serial]` | Generate QR Code |
| GET/POST | `/api/units` | List & register unit |
| GET | `/api/units/[id]` | Detail + history unit |
| GET/POST | `/api/stations` | Manajemen stasiun |
| GET/POST | `/api/products` | Manajemen produk |
| GET | `/api/reports/realtime` | Dashboard real-time |
| GET | `/api/reports/bottleneck` | Analisis bottleneck |
