'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  Package, Clock, Settings, CheckCircle, XCircle,
  Plus, QrCode, Eye, Download, X, AlertTriangle,
  Loader2, PartyPopper, Inbox,
} from 'lucide-react'

async function fetchUnits(params = '') {
  const res = await fetch(`/api/units${params}`)
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function fetchProducts() {
  const res = await fetch('/api/products')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    PENDING:     { label: 'Pending',  cls: 'badge-muted',   Icon: Clock },
    IN_PROGRESS: { label: 'Proses',   cls: 'badge-info',    Icon: Settings },
    COMPLETED:   { label: 'Selesai',  cls: 'badge-success', Icon: CheckCircle },
    REJECTED:    { label: 'Ditolak',  cls: 'badge-danger',  Icon: XCircle },
  }
  const s = map[status] || { label: status, cls: 'badge-muted', Icon: Clock }
  return (
    <span className={`badge ${s.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
      <s.Icon size={11} />
      {s.label}
    </span>
  )
}

function QRModal({ unit, onClose }: { unit: any; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={onClose}>
      <div
        className="card"
        style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <QrCode size={18} /> QR Code
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontFamily: 'monospace' }}>
          {unit.serialNumber}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/qr/${unit.serialNumber}?format=png`}
          alt={`QR ${unit.serialNumber}`}
          style={{ width: '100%', maxWidth: '280px', borderRadius: '8px', background: 'white', padding: '8px' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
          <a
            href={`/api/qr/${unit.serialNumber}?format=png`}
            download={`qr-${unit.serialNumber}.png`}
            className="btn btn-primary"
          >
            <Download size={15} /> Download
          </a>
          <button onClick={onClose} className="btn btn-outline"><X size={15} /> Tutup</button>
        </div>
      </div>
    </div>
  )
}

function RegisterModal({ products, onClose, onSuccess }: any) {
  const [productId, setProductId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId) { setError('Pilih produk'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal'); return }
      onSuccess(data.unit)
    } catch {
      setError('Koneksi gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={onClose}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Daftarkan Unit Baru
        </h3>
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}><AlertTriangle size={16} /><span>{error}</span></div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="label">Pilih Produk *</label>
            <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)} required>
              <option value="">— Pilih produk —</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.productCode} — {p.productName}</option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Serial number akan di-generate otomatis.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Mendaftar...</>
                : <><CheckCircle size={15} /> Daftarkan</>}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline"><X size={15} /> Batal</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UnitsPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showQR, setShowQR] = useState<any>(null)
  const [showRegister, setShowRegister] = useState(false)
  const [newUnit, setNewUnit] = useState<any>(null)

  const queryParams = statusFilter ? `?status=${statusFilter}` : ''
  const { data, isLoading } = useQuery({
    queryKey: ['units', statusFilter],
    queryFn: () => fetchUnits(queryParams),
    refetchInterval: 20000,
  })
  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: fetchProducts })

  const units = data?.units || []
  const products = productsData?.products || []
  const canRegister = session?.user?.role !== 'OPERATOR'

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Package size={26} color="var(--accent-blue)" />
            Unit Produksi
          </h1>
          <p className="page-subtitle">Daftar semua unit yang terdaftar di sistem ({data?.total || 0} total)</p>
        </div>
        {canRegister && (
          <button onClick={() => setShowRegister(true)} className="btn btn-primary">
            <Plus size={15} /> Daftarkan Unit Baru
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { value: '', label: 'Semua', Icon: null },
          { value: 'PENDING', label: 'Pending', Icon: Clock },
          { value: 'IN_PROGRESS', label: 'Proses', Icon: Settings },
          { value: 'COMPLETED', label: 'Selesai', Icon: CheckCircle },
          { value: 'REJECTED', label: 'Ditolak', Icon: XCircle },
        ].map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`btn ${statusFilter === value ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {Icon && <Icon size={13} />}
            {label}
          </button>
        ))}
      </div>

      {/* New unit success */}
      {newUnit && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <PartyPopper size={16} />
          <div>
            <strong>Unit berhasil didaftarkan!</strong>
            <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Serial: <span style={{ fontFamily: 'monospace' }}>{newUnit.serialNumber}</span>
              {' '}<button onClick={() => setShowQR(newUnit)} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <QrCode size={13} /> Cetak QR Code
              </button>
            </div>
          </div>
          <button onClick={() => setNewUnit(null)} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '2rem' }}>
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '0.5rem', borderRadius: '6px' }} />
            ))}
          </div>
        ) : units.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <Inbox size={52} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>Tidak ada unit ditemukan</p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ borderRadius: '12px', border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Produk</th>
                  <th>Stasiun Saat Ini</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Terdaftar</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u: any) => {
                  const pct = u.product
                    ? Math.round((u.currentSequence / u.product.totalStations) * 100)
                    : 0
                  return (
                    <tr key={u.id}>
                      <td>
                        <Link
                          href={`/dashboard/units/${u.id}`}
                          style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontFamily: 'monospace', fontSize: '0.82rem' }}
                        >
                          {u.serialNumber}
                        </Link>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {u.product?.productName}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {u.currentStation ? (
                          <span>{u.currentStation.stationName.split('—')[0].trim()}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Belum dimulai</span>
                        )}
                      </td>
                      <td><StatusBadge status={u.status} /></td>
                      <td style={{ minWidth: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="progress-bar" style={{ flex: 1, minWidth: '80px', width: '100%' }}>
                            <div
                              className={`progress-fill ${pct === 100 ? 'complete' : ''}`}
                              style={{
                                width: `${pct}%`,
                                background: pct === 100
                                  ? 'linear-gradient(90deg, #10b981, #059669)'
                                  : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', minWidth: '32px', flexShrink: 0 }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(u.registeredAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <Link href={`/dashboard/units/${u.id}`} className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', gap: '0.3rem' }}>
                            <Eye size={13} /> Detail
                          </Link>
                          <button onClick={() => setShowQR(u)} className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', gap: '0.3rem' }}>
                            <QrCode size={13} /> QR
                          </button>
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

      {/* Modals */}
      {showQR && <QRModal unit={showQR} onClose={() => setShowQR(null)} />}
      {showRegister && (
        <RegisterModal
          products={products}
          onClose={() => setShowRegister(false)}
          onSuccess={(unit: any) => {
            setShowRegister(false)
            setNewUnit(unit)
            qc.invalidateQueries({ queryKey: ['units'] })
          }}
        />
      )}
    </div>
  )
}
