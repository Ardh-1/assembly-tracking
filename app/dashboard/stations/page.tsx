'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Cpu, Plus, X, Loader2, CheckCircle, AlertTriangle, Save } from 'lucide-react'

async function fetchStations() {
  const res = await fetch('/api/stations')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export default function StationsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ stationCode: '', stationName: '', sequenceOrder: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['stations'], queryFn: fetchStations })
  const stations = data?.stations || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, sequenceOrder: parseInt(formData.sequenceOrder) }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Gagal'); return }
      qc.invalidateQueries({ queryKey: ['stations'] })
      setFormData({ stationCode: '', stationName: '', sequenceOrder: '', description: '' })
      setShowForm(false)
    } catch { setError('Koneksi gagal') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cpu size={26} color="var(--accent-blue)" />
            Manajemen Stasiun
          </h1>
          <p className="page-subtitle">Konfigurasi stasiun perakitan dan urutan proses</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`}>
          {showForm ? <><X size={15} /> Batal</> : <><Plus size={15} /> Tambah Stasiun</>}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem', animation: 'slideIn 0.2s ease' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Tambah Stasiun Baru</h3>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">Kode Stasiun *</label>
              <input className="input" placeholder="ST-006" value={formData.stationCode}
                onChange={(e) => setFormData((p) => ({ ...p, stationCode: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Nama Stasiun *</label>
              <input className="input" placeholder="Stasiun 6 — Inspeksi" value={formData.stationName}
                onChange={(e) => setFormData((p) => ({ ...p, stationName: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Urutan *</label>
              <input type="number" className="input" placeholder="6" min="1" value={formData.sequenceOrder}
                onChange={(e) => setFormData((p) => ({ ...p, sequenceOrder: e.target.value }))} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Deskripsi</label>
              <input className="input" placeholder="Deskripsi pekerjaan di stasiun ini..." value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</>
                  : <><Save size={15} /> Simpan Stasiun</>}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Stations grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {stations.map((s: any) => {
            const activeUnits = s._count?.assemblyUnits || 0
            const loadColor = activeUnits > 3 ? '#ef4444' : activeUnits > 1 ? '#f59e0b' : '#10b981'
            return (
              <div key={s.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Sequence badge */}
                <div style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.9rem', color: '#3b82f6',
                }}>
                  {s.sequenceOrder}
                </div>
                <div style={{ paddingRight: '2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <Cpu size={16} color="var(--accent-blue)" />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {s.stationCode}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {s.stationName}
                  </h3>
                  {s.description && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                      {s.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Unit aktif:</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: loadColor }}>
                    {activeUnits}
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>unit</span>
                  </span>
                </div>
                <div className="progress-bar" style={{ marginTop: '0.5rem', height: '4px' }}>
                  <div className="progress-fill" style={{
                    width: `${Math.min(100, (activeUnits / 5) * 100)}%`,
                    background: `linear-gradient(90deg, ${loadColor}, ${loadColor}aa)`,
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
