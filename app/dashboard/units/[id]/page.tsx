'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { use } from 'react'

// Next.js 15: params adalah Promise, gunakan React.use() untuk unwrap

async function fetchUnit(id: string) {
  const res = await fetch(`/api/units/${id}`)
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: string }> = {
    PENDING:     { label: 'Pending',  cls: 'badge-muted',   icon: '⏳' },
    IN_PROGRESS: { label: 'Proses',   cls: 'badge-info',    icon: '⚙️' },
    COMPLETED:   { label: 'Selesai',  cls: 'badge-success', icon: '✅' },
    REJECTED:    { label: 'Ditolak',  cls: 'badge-danger',  icon: '❌' },
  }
  const s = map[status] || { label: status, cls: 'badge-muted', icon: '?' }
  return <span className={`badge ${s.cls}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>{s.icon} {s.label}</span>
}

export default function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, error } = useQuery({
    queryKey: ['unit', id],
    queryFn: () => fetchUnit(id),
  })

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '120px', marginBottom: '1rem', borderRadius: '12px' }} />
        ))}
      </div>
    )
  }

  if (error || !data?.unit) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
        <p>Unit tidak ditemukan</p>
        <Link href="/dashboard/units" className="btn btn-outline" style={{ marginTop: '1rem', display: 'inline-flex' }}>← Kembali</Link>
      </div>
    )
  }

  const { unit } = data
  const pct = unit.product ? Math.round((unit.currentSequence / unit.product.totalStations) * 100) : 0
  const totalTime = unit.trackingLogs?.reduce((sum: number, l: any) => sum + (l.durationSeconds || 0), 0) || 0
  const totalMinutes = Math.round(totalTime / 60)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Back */}
      <Link href="/dashboard/units" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.25rem' }}>
        ← Kembali ke Daftar Unit
      </Link>

      {/* Header card */}
      <div className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, #1a2235, #1e2a42)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Serial Number
            </div>
            <h1 style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, color: '#e8eef7' }}>
              {unit.serialNumber}
            </h1>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {unit.product?.productName}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <StatusBadge status={unit.status} />
            <a
              href={`/api/qr/${unit.serialNumber}?format=png`}
              download
              className="btn btn-outline"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              📥 QR Code
            </a>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Progress Perakitan</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: pct === 100 ? '#10b981' : '#e8eef7' }}>
              {unit.currentSequence}/{unit.product?.totalStations || 5} Stasiun ({pct}%)
            </span>
          </div>
          <div className="progress-bar" style={{ height: '10px' }}>
            <div className={`progress-fill ${pct === 100 ? 'complete' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Stasiun Saat Ini', value: unit.currentStation?.stationName?.split('—')[0] || '—' },
          { label: 'Total Waktu Produksi', value: totalMinutes > 0 ? `${totalMinutes} menit` : '—' },
          { label: 'Didaftarkan Oleh', value: unit.registeredBy?.name || '—' },
          { label: 'Tanggal Daftar', value: new Date(unit.registeredAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) },
          ...(unit.completedAt ? [{ label: 'Tanggal Selesai', value: new Date(unit.completedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) }] : []),
        ].map((item) => (
          <div key={item.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              {item.label}
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Tracking timeline */}
      <div className="card">
        <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>📋 Riwayat Tracking</h2>
        {unit.trackingLogs?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Belum ada riwayat scan</p>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute', left: '15px', top: '0', bottom: '0',
              width: '2px', background: 'var(--border)',
            }} />
            {unit.trackingLogs?.map((log: any, i: number) => (
              <div key={log.id} style={{
                display: 'flex', gap: '1rem', marginBottom: '1.25rem', position: 'relative',
              }}>
                {/* Dot */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: log.status === 'SUCCESS' ? '#10b981' : log.status === 'ERROR' ? '#ef4444' : '#f59e0b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', zIndex: 1,
                  boxShadow: `0 0 12px ${log.status === 'SUCCESS' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                }}>
                  {log.status === 'SUCCESS' ? '✓' : log.status === 'ERROR' ? '✗' : '—'}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.25rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {log.station?.stationName}
                      </span>
                      <span style={{
                        marginLeft: '0.5rem', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
                        color: log.status === 'SUCCESS' ? '#10b981' : '#ef4444',
                      }}>
                        {log.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(log.scannedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Operator: {log.operator?.name}
                    {log.durationSeconds && (
                      <span style={{ marginLeft: '0.75rem', color: 'var(--text-muted)' }}>
                        ⏱ {Math.round(log.durationSeconds / 60)} menit
                      </span>
                    )}
                  </div>
                  {log.notes && (
                    <div style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      📝 {log.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
