'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

async function fetchStations() {
  const res = await fetch('/api/stations')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

type ScanResult = {
  success: boolean
  message?: string
  error?: string
  unit?: any
  trackingLog?: any
  isCompleted?: boolean
  progress?: { current: number; total: number; percentage: number }
  code?: string
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [selectedStation, setSelectedStation] = useState('')
  const [manualSerial, setManualSerial] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastScanned, setLastScanned] = useState('')
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const cooldownRef = useRef(false)

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: fetchStations,
  })
  const stations = stationsData?.stations || []

  // Process scan result
  const processScan = useCallback(async (serialNumber: string) => {
    if (!selectedStation) {
      setResult({ success: false, error: '⚠️ Pilih stasiun terlebih dahulu!' })
      return
    }
    if (cooldownRef.current || serialNumber === lastScanned) return
    cooldownRef.current = true
    setLoading(true)
    setLastScanned(serialNumber)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber, stationId: selectedStation }),
      })
      const data: ScanResult = await res.json()
      setResult(data)
      setScanHistory((prev) => [data, ...prev.slice(0, 9)])

      // Vibrate feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(data.success ? [100, 50, 100] : [300])
      }
    } catch (err) {
      setResult({ success: false, error: 'Koneksi gagal. Periksa internet Anda.' })
    } finally {
      setLoading(false)
      setTimeout(() => { cooldownRef.current = false }, 2500)
    }
  }, [selectedStation, lastScanned])

  // Start camera scanner
  const startScanner = useCallback(async () => {
    if (!selectedStation) {
      alert('Pilih stasiun terlebih dahulu!')
      return
    }
    try {
      // Dynamic import html5-qrcode
      const { Html5Qrcode } = await import('html5-qrcode')
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {})
      }
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        async (decodedText: string) => {
          // Try parse JSON from QR
          let serial = decodedText
          try {
            const parsed = JSON.parse(decodedText)
            if (parsed.sn) serial = parsed.sn
          } catch {}
          await processScan(serial)
        },
        () => {} // ignore scan errors
      )
      setIsScanning(true)
      setResult(null)
    } catch (err: any) {
      console.error('Camera error:', err)
      alert('Gagal membuka kamera. Pastikan izin kamera diizinkan di browser.')
    }
  }, [selectedStation, processScan])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  // Manual submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualSerial.trim()) return
    await processScan(manualSerial.trim())
    setManualSerial('')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner() }
  }, [stopScanner])

  const resultBg = result
    ? result.success
      ? 'rgba(16,185,129,0.12)'
      : 'rgba(239,68,68,0.12)'
    : 'transparent'
  const resultBorder = result
    ? result.success ? '#10b981' : '#ef4444'
    : 'var(--border)'

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">📷 Scanner QR Code</h1>
        <p className="page-subtitle">Scan QR unit untuk update status produksi</p>
      </div>

      {/* Station selector */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <label className="label">🏭 Pilih Stasiun Saat Ini *</label>
        <select
          className="input"
          value={selectedStation}
          onChange={(e) => { setSelectedStation(e.target.value); setResult(null); setLastScanned('') }}
          style={{ fontSize: '1rem', padding: '0.75rem' }}
        >
          <option value="">— Pilih stasiun —</option>
          {stations.map((s: any) => (
            <option key={s.id} value={s.id}>
              Urutan {s.sequenceOrder}: {s.stationName}
            </option>
          ))}
        </select>
        {selectedStation && (
          <p style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.4rem' }}>
            ✓ Stasiun dipilih — siap scan
          </p>
        )}
      </div>

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['camera', 'manual'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); if (m !== 'camera') stopScanner() }}
            className={`btn ${mode === m ? 'btn-primary' : 'btn-outline'}`}
          >
            {m === 'camera' ? '📷 Kamera' : '⌨️ Manual'}
          </button>
        ))}
      </div>

      {/* Camera scanner */}
      {mode === 'camera' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: '#000', minHeight: '300px' }}>
            <div id="qr-reader" style={{ width: '100%' }} />
            {!isScanning && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '1rem',
                background: 'rgba(0,0,0,0.7)',
              }}>
                <div style={{ fontSize: '3rem' }}>📷</div>
                <p style={{ color: '#8ba0c0', fontSize: '0.9rem', textAlign: 'center', maxWidth: '200px' }}>
                  Klik tombol di bawah untuk memulai kamera
                </p>
              </div>
            )}
            {loading && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
              }}>
                <div style={{
                  width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.2)',
                  borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            {!isScanning ? (
              <button
                onClick={startScanner}
                className="btn btn-success"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={!selectedStation}
              >
                🟢 Mulai Scanner
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="btn btn-danger"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                🔴 Stop Scanner
              </button>
            )}
          </div>
          {!selectedStation && (
            <p style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '0.5rem', textAlign: 'center' }}>
              ⚠️ Pilih stasiun dulu sebelum scan
            </p>
          )}
        </div>
      )}

      {/* Manual input */}
      {mode === 'manual' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleManualSubmit}>
            <label className="label">Serial Number / Kode QR</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="input"
                placeholder="Scan atau ketik serial number..."
                value={manualSerial}
                onChange={(e) => setManualSerial(e.target.value)}
                autoFocus
                style={{ flex: 1, fontSize: '1rem' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !manualSerial.trim() || !selectedStation}
              >
                {loading ? '⏳' : '✓ Submit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Result feedback */}
      {result && (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            border: `2px solid ${resultBorder}`,
            background: resultBg,
            marginBottom: '1rem',
            animation: 'slideIn 0.3s ease',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.75rem', lineHeight: 1 }}>
              {result.success ? (result.isCompleted ? '🎉' : '✅') : '❌'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem',
                color: result.success ? '#34d399' : '#f87171',
              }}>
                {result.success ? 'BERHASIL' : 'GAGAL'}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {result.message || result.error}
              </div>
              {result.progress && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Progress Unit</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {result.progress.current}/{result.progress.total} stasiun ({result.progress.percentage}%)
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: '8px' }}>
                    <div
                      className={`progress-fill ${result.progress.percentage === 100 ? 'complete' : ''}`}
                      style={{ width: `${result.progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
              {result.unit && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Serial: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{result.unit.serialNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scan history */}
      {scanHistory.length > 0 && (
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
            📜 Riwayat Scan Sesi Ini
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {scanHistory.map((h, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.75rem', borderRadius: '8px',
                background: h.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${h.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
                <span style={{ fontSize: '0.9rem' }}>{h.success ? '✅' : '❌'}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.unit?.serialNumber || 'Unknown'}
                </span>
                <span style={{ fontSize: '0.75rem', color: h.success ? '#10b981' : '#ef4444', flexShrink: 0, fontWeight: 600 }}>
                  {h.progress ? `${h.progress.percentage}%` : h.success ? 'OK' : 'ERR'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
