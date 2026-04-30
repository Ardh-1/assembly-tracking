'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Wrench, Plus, X, Loader2, Save, AlertTriangle, CheckCircle, PauseCircle, Package } from 'lucide-react'

async function fetchProducts() {
  const res = await fetch('/api/products')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ productCode: '', productName: '', description: '', totalStations: '5' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })
  const products = data?.products || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, totalStations: parseInt(formData.totalStations) }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Gagal'); return }
      qc.invalidateQueries({ queryKey: ['products'] })
      setFormData({ productCode: '', productName: '', description: '', totalStations: '5' })
      setShowForm(false)
    } catch { setError('Koneksi gagal') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wrench size={26} color="var(--accent-blue)" />
            Master Produk
          </h1>
          <p className="page-subtitle">Konfigurasi spesifikasi produk yang diproduksi</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={`btn ${showForm ? 'btn-outline' : 'btn-primary'}`}>
          {showForm ? <><X size={15} /> Batal</> : <><Plus size={15} /> Tambah Produk</>}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem', animation: 'slideIn 0.2s ease' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Tambah Produk Baru</h3>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">Kode Produk *</label>
              <input className="input" placeholder="PROD-002" value={formData.productCode}
                onChange={(e) => setFormData((p) => ({ ...p, productCode: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Nama Produk *</label>
              <input className="input" placeholder="Nama produk" value={formData.productName}
                onChange={(e) => setFormData((p) => ({ ...p, productName: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Total Stasiun *</label>
              <input type="number" className="input" min="1" max="20" value={formData.totalStations}
                onChange={(e) => setFormData((p) => ({ ...p, totalStations: e.target.value }))} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Deskripsi</label>
              <input className="input" placeholder="Deskripsi spesifikasi produk..." value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</>
                  : <><Save size={15} /> Simpan Produk</>}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">Batal</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: '100px', marginBottom: '0.75rem', borderRadius: '12px' }} />)
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Wrench size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>Belum ada produk terdaftar</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {products.map((p: any) => (
            <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wrench size={22} color="#8b5cf6" />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{p.productCode}</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{p.productName}</div>
                {p.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6' }}>{p.totalStations}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stasiun</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6' }}>{p._count?.assemblyUnits || 0}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unit</div>
                </div>
              </div>
              <span className={`badge ${p.isActive ? 'badge-success' : 'badge-muted'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                {p.isActive
                  ? <><CheckCircle size={11} /> Aktif</>
                  : <><PauseCircle size={11} /> Non-aktif</>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
