'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Cpu, Plus, X, Loader2, CheckCircle, AlertTriangle, Save, Trash2 } from 'lucide-react'

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

  // Delete modal state
  const [stationToDelete, setStationToDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['stations'], queryFn: fetchStations })
  const stations = data?.stations || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setActionFeedback(null)
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
      setActionFeedback({ type: 'success', message: 'Stasiun berhasil ditambahkan' })
    } catch { setError('Koneksi gagal') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!stationToDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/stations/${stationToDelete.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error || 'Gagal menghapus stasiun')
        return
      }
      qc.invalidateQueries({ queryKey: ['stations'] })
      setActionFeedback({ type: 'success', message: data.message || 'Stasiun berhasil dihapus' })
      setStationToDelete(null)
    } catch {
      setDeleteError('Koneksi gagal saat menghapus stasiun')
    } finally {
      setDeleting(false)
    }
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
        <button onClick={() => { setShowForm(!showForm); setError(''); setActionFeedback(null) }} className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`}>
          {showForm ? <><X size={15} /> Batal</> : <><Plus size={15} /> Tambah Stasiun</>}
        </button>
      </div>

      {actionFeedback && (
        <div className={`alert ${actionFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1.25rem' }}>
          {actionFeedback.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{actionFeedback.message}</span>
          <button onClick={() => setActionFeedback(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <X size={14} />
          </button>
        </div>
      )}

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
      ) : stations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Cpu size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>Belum ada stasiun terdaftar</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {stations.map((s: any) => {
            const activeUnits = s._count?.assemblyUnits || 0
            const loadColor = activeUnits > 3 ? '#ef4444' : activeUnits > 1 ? '#f59e0b' : '#10b981'
            return (
              <div key={s.id} className="card" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                <div style={{ paddingRight: '2.5rem', flex: 1 }}>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem', paddingTop: '0.5rem' }}>
                  <button
                    onClick={() => { setStationToDelete(s); setDeleteError('') }}
                    className="btn btn-outline"
                    style={{
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    title="Hapus Stasiun"
                  >
                    <Trash2 size={13} />
                    Hapus
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Konfirmasi Hapus Stasiun */}
      {stationToDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={() => !deleting && setStationToDelete(null)}>
          <div
            className="card"
            style={{ maxWidth: '420px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', color: '#ef4444' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 size={20} />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>
                Hapus Stasiun
              </h3>
            </div>

            {deleteError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={16} />
                <span style={{ fontSize: '0.85rem' }}>{deleteError}</span>
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              Apakah Anda yakin ingin menghapus stasiun <strong style={{ color: 'var(--text-primary)' }}>{stationToDelete.stationName}</strong> (<span style={{ fontFamily: 'monospace' }}>{stationToDelete.stationCode}</span>)?
            </p>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              Stasiun dengan riwayat log pemindaian akan dinonaktifkan dari lini aktif agar integritas riwayat scan tetap terjaga.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setStationToDelete(null)}
                className="btn btn-outline"
                disabled={deleting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={deleting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {deleting ? (
                  <><Loader2 size={14} className="animate-spin" /> Menghapus...</>
                ) : (
                  <><Trash2 size={14} /> Ya, Hapus Stasiun</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
