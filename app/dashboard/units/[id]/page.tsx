'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { use, useState } from 'react'
import {
  XCircle, RotateCcw, AlertTriangle, CheckCircle,
  X, Loader2, ArrowLeft, QrCode, Clock, Settings,
  Download, ClipboardList, FileText, Check, Minus,
} from 'lucide-react'

// Next.js 15: params adalah Promise, gunakan React.use() untuk unwrap

async function fetchUnit(id: string) {
  const res = await fetch(`/api/units/${id}`)
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
    <span className={`badge ${s.cls}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <s.Icon size={13} /> {s.label}
    </span>
  )
}

function RejectModal({
  unit,
  onClose,
  onSuccess,
}: {
  unit: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', reason }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menolak unit')
        return
      }
      onSuccess()
    } catch {
      setError('Koneksi gagal ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: '440px', width: '100%', border: '1px solid rgba(239, 68, 68, 0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontWeight: 700,
            marginBottom: '1rem',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#ef4444',
          }}
        >
          <XCircle size={20} /> Tolak Unit Produksi
        </h3>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Anda akan mengubah status unit <strong style={{ color: '#e8eef7' }}>{unit.serialNumber}</strong> menjadi{' '}
          <span style={{ color: '#ef4444', fontWeight: 600 }}>DITOLAK (REJECTED)</span>. Unit tidak akan dapat dipindai lagi di stasiun perakitan.
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="label">Alasan Penolakan / Catatan Defect</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Contoh: Komponen rusak, cacat fisik perakitan, gagal uji fungsi..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <XCircle size={15} /> Konfirmasi Tolak
                </>
              )}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline">
              <X size={15} /> Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session } = useSession()
  const qc = useQueryClient()
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['unit', id],
    queryFn: () => fetchUnit(id),
  })

  const canManageStatus = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERVISOR'

  const handleRestore = async (unit: any) => {
    if (!confirm(`Pulihkan status unit "${unit.serialNumber}" agar dapat diproses kembali di lini perakitan?`)) return
    setRestoring(true)
    try {
      const nextStatus = unit.currentSequence > 0 ? 'IN_PROGRESS' : 'PENDING'
      const res = await fetch(`/api/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          reason: 'Status dipulihkan kembali oleh Supervisor/Admin',
        }),
      })
      const resData = await res.json()
      if (!res.ok) {
        alert(resData.error || 'Gagal memulihkan status unit')
        return
      }
      qc.invalidateQueries({ queryKey: ['unit', id] })
      qc.invalidateQueries({ queryKey: ['units'] })
    } catch {
      alert('Koneksi gagal ke server')
    } finally {
      setRestoring(false)
    }
  }

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
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <XCircle size={48} color="#ef4444" />
        </div>
        <p>Unit tidak ditemukan</p>
        <Link href="/dashboard/units" className="btn btn-outline" style={{ marginTop: '1rem', display: 'inline-flex' }}>← Kembali</Link>
      </div>
    )
  }

  const { unit } = data
  const isRejected = unit.status === 'REJECTED'
  const pct = unit.product ? Math.round((unit.currentSequence / unit.product.totalStations) * 100) : 0
  const totalTime = unit.trackingLogs?.reduce((sum: number, l: any) => sum + (l.durationSeconds || 0), 0) || 0
  const totalMinutes = Math.round(totalTime / 60)

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Back */}
      <Link href="/dashboard/units" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.25rem' }}>
        <ArrowLeft size={15} /> Kembali ke Daftar Unit
      </Link>

      {/* Alert jika unit Ditolak */}
      {isRejected && (
        <div
          className="alert alert-error"
          style={{
            marginBottom: '1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '12px',
          }}
        >
          <XCircle size={22} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#ef4444', fontSize: '0.95rem' }}>Unit ini berstatus DITOLAK (REJECTED)</strong>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
              Unit ini dihentikan dari lini produksi dan QR code tidak dapat dipindai di stasiun manapun.
              {canManageStatus && ' Sebagai Supervisor/Admin, Anda dapat memulihkan status unit jika diperlukan.'}
            </p>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="card" style={{ marginBottom: '1rem', background: isRejected ? 'linear-gradient(135deg, #2b181b, #1e2230)' : 'linear-gradient(135deg, #1a2235, #1e2a42)' }}>
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
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <a
                href={`/api/qr/${unit.serialNumber}?format=png`}
                download
                className="btn btn-outline"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Download size={14} /> QR Code
              </a>

              {canManageStatus && !isRejected && (
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="btn btn-danger"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', gap: '0.3rem' }}
                >
                  <XCircle size={14} /> Tolak Unit
                </button>
              )}

              {canManageStatus && isRejected && (
                <button
                  onClick={() => handleRestore(unit)}
                  disabled={restoring}
                  className="btn btn-outline"
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.35rem 0.75rem',
                    borderColor: '#10b981',
                    color: '#10b981',
                    gap: '0.3rem',
                  }}
                >
                  {restoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Pulihkan Unit
                </button>
              )}
            </div>
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
        <h2 className="section-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList size={20} /> Riwayat Tracking
        </h2>
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
                  {log.status === 'SUCCESS' ? <Check size={16} color="white" /> : log.status === 'ERROR' ? <X size={16} color="white" /> : <Minus size={16} color="white" />}
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
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span>Operator: {log.operator?.name}</span>
                    {log.durationSeconds && (
                      <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> {Math.round(log.durationSeconds / 60)} menit
                      </span>
                    )}
                  </div>
                  {log.notes && (
                    <div style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '0.25rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <FileText size={13} /> {log.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          unit={unit}
          onClose={() => setShowRejectModal(false)}
          onSuccess={() => {
            setShowRejectModal(false)
            qc.invalidateQueries({ queryKey: ['unit', id] })
            qc.invalidateQueries({ queryKey: ['units'] })
          }}
        />
      )}
    </div>
  )
}

