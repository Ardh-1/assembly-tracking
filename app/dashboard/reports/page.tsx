'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

async function fetchBottleneck(days: number) {
  const res = await fetch(`/api/reports/bottleneck?days=${days}`)
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchRealtime() {
  const res = await fetch('/api/reports/realtime')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export default function ReportsPage() {
  const [days, setDays] = useState(7)
  const { data: bn, isLoading: bnLoading } = useQuery({
    queryKey: ['bottleneck', days],
    queryFn: () => fetchBottleneck(days),
  })
  const { data: rt, isLoading: rtLoading } = useQuery({
    queryKey: ['realtime'],
    queryFn: fetchRealtime,
    refetchInterval: 15000,
  })

  const bottleneck = bn?.bottleneck || []
  const summary = rt?.summary || {}
  const maxAvg = bottleneck.length > 0 ? Math.max(...bottleneck.map((b: any) => b.avgMinutes), 1) : 1
  const completionRate = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">📈 Laporan & Analisis</h1>
        <p className="page-subtitle">Bottleneck analysis dan statistik produksi</p>
      </div>

      {/* KPI summary */}
      {!rtLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Unit', value: summary.total || 0, color: '#3b82f6', icon: '📦' },
            { label: 'Completion Rate', value: `${completionRate}%`, color: '#10b981', icon: '✅' },
            { label: 'Dalam Proses', value: summary.inProgress || 0, color: '#f59e0b', icon: '⚙️' },
            { label: 'Pending', value: summary.pending || 0, color: '#8ba0c0', icon: '⏳' },
          ].map((kpi) => (
            <div key={kpi.label} className="stat-card">
              <div className="stat-icon" style={{ background: `${kpi.color}18`, fontSize: '1.2rem' }}>{kpi.icon}</div>
              <div>
                <div className="stat-value" style={{ color: kpi.color, fontSize: '1.5rem' }}>{kpi.value}</div>
                <div className="stat-label">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottleneck Analysis */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 className="section-title">⚠️ Analisis Bottleneck per Stasiun</h2>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[3, 7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`btn ${days === d ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }}
              >
                {d}h
              </button>
            ))}
          </div>
        </div>

        {bnLoading ? (
          Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '72px', marginBottom: '0.75rem', borderRadius: '8px' }} />)
        ) : bottleneck.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
            <p>Belum ada data untuk periode ini</p>
          </div>
        ) : (
          bottleneck.map((b: any) => {
            const isBottleneck = b.avgMinutes === maxAvg
            return (
              <div key={b.stationId} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '0.6rem',
                background: isBottleneck ? 'rgba(239,68,68,0.07)' : 'var(--bg-secondary)',
                border: `1px solid ${isBottleneck ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                transition: 'all 0.2s',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isBottleneck ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)',
                  fontWeight: 800, fontSize: '0.9rem',
                  color: isBottleneck ? '#ef4444' : '#3b82f6',
                }}>
                  {b.sequenceOrder}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{b.stationName}</span>
                    {isBottleneck && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>🔴 BOTTLENECK</span>}
                    {b.errorRate > 10 && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>⚠️ Error Tinggi</span>}
                  </div>
                  <div className="progress-bar" style={{ height: '8px' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(b.avgMinutes / maxAvg) * 100}%`,
                        background: isBottleneck
                          ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                          : b.avgMinutes > maxAvg * 0.6
                          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                          : 'linear-gradient(90deg, #10b981, #059669)',
                      }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: isBottleneck ? '#ef4444' : 'var(--text-primary)' }}>
                    {b.avgMinutes} <span style={{ fontSize: '0.72rem', fontWeight: 400 }}>mnt</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {b.totalScans} scan · {b.errorRate}% err
                  </div>
                </div>
              </div>
            )
          })
        )}

        {bottleneck.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <p style={{ fontSize: '0.82rem', color: '#60a5fa' }}>
              💡 <strong>Insight:</strong> Stasiun dengan bar merah paling panjang adalah bottleneck utama.
              Pertimbangkan penambahan operator atau optimasi proses di stasiun tersebut.
            </p>
          </div>
        )}
      </div>

      {/* Station real-time distribution */}
      <div className="card">
        <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>🏭 Distribusi Unit Per Stasiun (Real-time)</h2>
        {rtLoading ? (
          Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '0.5rem', borderRadius: '6px' }} />)
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stasiun</th>
                  <th>Unit Aktif</th>
                  <th>Load</th>
                </tr>
              </thead>
              <tbody>
                {(rt?.stationCounts || []).map((s: any) => {
                  const maxUnits = Math.max(...(rt?.stationCounts || []).map((x: any) => x.activeUnits), 1)
                  const loadPct = Math.round((s.activeUnits / maxUnits) * 100)
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{s.sequenceOrder}</td>
                      <td style={{ fontWeight: 500 }}>{s.stationName}</td>
                      <td>
                        <span style={{
                          fontWeight: 700, fontSize: '1rem',
                          color: s.activeUnits > 3 ? '#ef4444' : s.activeUnits > 1 ? '#f59e0b' : '#10b981',
                        }}>
                          {s.activeUnits}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> unit</span>
                      </td>
                      <td style={{ minWidth: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${loadPct}%`, background: s.activeUnits > 3 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : undefined }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', minWidth: '36px' }}>{s.activeUnits} unit</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
