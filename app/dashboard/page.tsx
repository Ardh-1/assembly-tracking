'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

async function fetchRealtime() {
  const res = await fetch('/api/reports/realtime')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchBottleneck() {
  const res = await fetch('/api/reports/bottleneck?days=7')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

function StatCard({ icon, label, value, color, href }: any) {
  const el = (
    <div className="stat-card" style={{ cursor: href ? 'pointer' : 'default' }}>
      <div className="stat-icon" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        {icon}
      </div>
      <div>
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{el}</Link> : el
}

function ProgressBar({ value, max, color = 'var(--accent-blue)' }: any) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div className="progress-bar">
        <div
          className={`progress-fill ${pct === 100 ? 'complete' : ''}`}
          style={{ width: `${pct}%`, background: pct === 100 ? undefined : `linear-gradient(90deg, ${color}, ${color}cc)` }}
        />
      </div>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', minWidth: '36px' }}>{pct}%</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'badge-muted' },
    IN_PROGRESS: { label: 'Proses', cls: 'badge-info' },
    COMPLETED: { label: 'Selesai', cls: 'badge-success' },
    REJECTED: { label: 'Ditolak', cls: 'badge-danger' },
  }
  const s = map[status] || { label: status, cls: 'badge-muted' }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

export default function DashboardPage() {
  const { data: rt, isLoading: rtLoading } = useQuery({
    queryKey: ['realtime'],
    queryFn: fetchRealtime,
    refetchInterval: 15000,
  })

  const { data: bn, isLoading: bnLoading } = useQuery({
    queryKey: ['bottleneck'],
    queryFn: fetchBottleneck,
  })

  const summary = rt?.summary || {}
  const bottleneck = bn?.bottleneck || []
  const stationCounts = rt?.stationCounts || []
  const activeUnits = rt?.activeUnits || []

  const maxAvg = bottleneck.length > 0 ? Math.max(...bottleneck.map((b: any) => b.avgMinutes)) : 1

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Dashboard Produksi</h1>
          <p className="page-subtitle">Monitoring real-time lini perakitan</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/scan" className="btn btn-primary">📷 Scan Unit</Link>
          <Link href="/dashboard/units" className="btn btn-outline">➕ Daftar Unit Baru</Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid-cols-auto" style={{ display: 'grid', gap: '1rem', marginBottom: '1.75rem' }}>
        {rtLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} style={{ height: '88px', borderRadius: '12px' }} className="skeleton" />
          ))
        ) : (
          <>
            <StatCard icon="📦" label="Total Unit" value={summary.total || 0} color="#3b82f6" href="/dashboard/units" />
            <StatCard icon="⏳" label="Pending" value={summary.pending || 0} color="#8ba0c0" />
            <StatCard icon="⚙️" label="Dalam Proses" value={summary.inProgress || 0} color="#f59e0b" />
            <StatCard icon="✅" label="Selesai" value={summary.completed || 0} color="#10b981" />
            {summary.rejected > 0 && (
              <StatCard icon="❌" label="Ditolak" value={summary.rejected} color="#ef4444" />
            )}
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Station Load */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 className="section-title">🏭 Beban Stasiun (Real-time)</h2>
            <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '9999px', color: '#10b981' }}>
              ● Live
            </span>
          </div>
          {rtLoading ? (
            Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '36px', marginBottom: '0.5rem', borderRadius: '6px' }} />)
          ) : stationCounts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tidak ada data stasiun</p>
          ) : (
            stationCounts.map((s: any) => (
              <div key={s.id} style={{ marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {s.stationName.split('—')[0].trim()}
                  </span>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 700,
                    color: s.activeUnits > 3 ? '#ef4444' : s.activeUnits > 1 ? '#f59e0b' : '#10b981',
                  }}>
                    {s.activeUnits} unit
                  </span>
                </div>
                <ProgressBar value={s.activeUnits} max={Math.max(5, summary.inProgress || 5)} color={s.activeUnits > 3 ? '#ef4444' : '#3b82f6'} />
              </div>
            ))
          )}
        </div>

        {/* Bottleneck */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 className="section-title">⚠️ Analisis Bottleneck</h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>7 hari terakhir</span>
          </div>
          {bnLoading ? (
            Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '0.5rem', borderRadius: '6px' }} />)
          ) : bottleneck.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Belum ada data analisis</p>
          ) : (
            bottleneck.map((b: any, i: number) => (
              <div key={b.stationId} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
                  background: b.avgMinutes === Math.max(...bottleneck.map((x: any) => x.avgMinutes))
                    ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700,
                  color: b.avgMinutes === Math.max(...bottleneck.map((x: any) => x.avgMinutes)) ? '#ef4444' : '#3b82f6',
                }}>
                  {b.sequenceOrder}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                      {b.stationName.split('—')[1]?.trim() || b.stationName}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, marginLeft: '0.5rem' }}>
                      {b.avgMinutes} min
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(b.avgMinutes / maxAvg) * 100}%`,
                        background: b.avgMinutes > maxAvg * 0.8
                          ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                          : b.avgMinutes > maxAvg * 0.5
                          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                          : 'linear-gradient(90deg, #10b981, #059669)',
                      }}
                    />
                  </div>
                </div>
                {b.errorRate > 0 && (
                  <span className="badge badge-danger" style={{ fontSize: '0.65rem', flexShrink: 0 }}>{b.errorRate}% err</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active Units Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="section-title">📋 Unit Aktif</h2>
          <Link href="/dashboard/units" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', textDecoration: 'none' }}>
            Lihat semua →
          </Link>
        </div>

        {rtLoading ? (
          <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />
        ) : activeUnits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <p>Belum ada unit aktif</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Produk</th>
                  <th>Stasiun Saat Ini</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {activeUnits.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/dashboard/units/${u.id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        {u.serialNumber}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.product?.productName}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {u.currentStation
                        ? <span>{u.currentStation.stationName.split('—')[0].trim()}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td><StatusBadge status={u.status} /></td>
                    <td style={{ minWidth: '140px' }}>
                      <ProgressBar value={u.currentSequence} max={u.product?.totalStations || 5} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
