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
  const content = (
    <div className="stat-card" style={{ cursor: href ? 'pointer' : 'default' }}>
      <div className="stat-icon" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        {icon}
      </div>
      <div>
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link> : content
}

function ProgressBar({ value, max, color = 'var(--blue)' }: any) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div className="progress-bar">
        <div
          className={`progress-fill ${pct === 100 ? 'complete' : ''}`}
          style={{ width: `${pct}%`, background: pct === 100 ? undefined : color }}
        />
      </div>
      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', minWidth: '32px', textAlign: 'right' }}>
        {pct}%
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:     { label: 'Pending',  cls: 'badge-muted' },
    IN_PROGRESS: { label: 'Proses',   cls: 'badge-blue' },
    COMPLETED:   { label: 'Selesai',  cls: 'badge-green' },
    REJECTED:    { label: 'Ditolak',  cls: 'badge-red' },
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

  const summary       = rt?.summary      || {}
  const bottleneck    = bn?.bottleneck   || []
  const stationCounts = rt?.stationCounts|| []
  const activeUnits   = rt?.activeUnits  || []
  const maxAvg = bottleneck.length > 0 ? Math.max(...bottleneck.map((b: any) => b.avgMinutes)) : 1

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Monitoring lini perakitan</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/dashboard/scan" className="btn btn-primary btn-sm">📷 Scan</Link>
          <Link href="/dashboard/units" className="btn btn-ghost btn-sm">+ Unit</Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem', marginBottom: '1rem' }}>
        {rtLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} style={{ height: '72px', borderRadius: '12px' }} className="skeleton" />
          ))
        ) : (
          <>
            <StatCard icon="📦" label="Total"   value={summary.total      || 0} color="var(--blue)"   href="/dashboard/units" />
            <StatCard icon="✅" label="Selesai"  value={summary.completed  || 0} color="var(--green)" />
            <StatCard icon="⚙️" label="Proses"  value={summary.inProgress || 0} color="var(--yellow)"/>
            <StatCard icon="⏳" label="Pending"  value={summary.pending    || 0} color="var(--text-muted)" />
          </>
        )}
      </div>

      {/* Station Load + Bottleneck */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>

        {/* Station Load */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <span className="section-title">Beban Stasiun</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)' }} />
              Live
            </span>
          </div>
          {rtLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '28px', marginBottom: '0.5rem' }} />
            ))
          ) : stationCounts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Tidak ada data</p>
          ) : (
            stationCounts.map((s: any) => (
              <div key={s.id} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {s.stationName.split('—')[0].trim()}
                  </span>
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 600,
                    color: s.activeUnits > 3 ? 'var(--red)' : s.activeUnits > 1 ? 'var(--yellow)' : 'var(--green)',
                  }}>
                    {s.activeUnits} unit
                  </span>
                </div>
                <ProgressBar
                  value={s.activeUnits}
                  max={Math.max(5, summary.inProgress || 5)}
                  color={s.activeUnits > 3 ? 'var(--red)' : 'var(--blue)'}
                />
              </div>
            ))
          )}
        </div>

        {/* Bottleneck */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <span className="section-title">Bottleneck</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>7 hari</span>
          </div>
          {bnLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '36px', marginBottom: '0.5rem' }} />
            ))
          ) : bottleneck.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Belum ada data</p>
          ) : (
            bottleneck.map((b: any) => (
              <div key={b.stationId} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0,
                  background: b.avgMinutes === maxAvg ? 'var(--red-dim)' : 'var(--blue-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6875rem', fontWeight: 700,
                  color: b.avgMinutes === maxAvg ? 'var(--red)' : 'var(--blue)',
                }}>
                  {b.sequenceOrder}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.stationName.split('—')[1]?.trim() || b.stationName}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', flexShrink: 0, marginLeft: '0.5rem' }}>
                      {b.avgMinutes}m
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${(b.avgMinutes / maxAvg) * 100}%`,
                      background: b.avgMinutes > maxAvg * 0.8 ? 'var(--red)' : b.avgMinutes > maxAvg * 0.5 ? 'var(--yellow)' : 'var(--green)',
                    }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Active Units */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <span className="section-title">Unit Aktif</span>
          <Link href="/dashboard/units" style={{ fontSize: '0.75rem', color: 'var(--blue)' }}>
            Lihat semua →
          </Link>
        </div>

        {rtLoading ? (
          <div className="skeleton" style={{ height: '160px' }} />
        ) : activeUnits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
            <p style={{ fontSize: '0.8125rem' }}>Belum ada unit aktif</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Serial</th>
                  <th>Stasiun</th>
                  <th>Status</th>
                  <th style={{ minWidth: '100px' }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {activeUnits.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/dashboard/units/${u.id}`} style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {u.serialNumber}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {u.currentStation
                        ? u.currentStation.stationName.split('—')[0].trim()
                        : <span style={{ color: 'var(--text-subtle)' }}>—</span>}
                    </td>
                    <td><StatusBadge status={u.status} /></td>
                    <td>
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
