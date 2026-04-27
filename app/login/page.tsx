'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Email atau password salah. Silakan coba lagi.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const loginAs = (role: string) => {
    const creds: Record<string, { email: string; password: string }> = {
      admin: { email: 'admin@factory.com', password: 'admin123' },
      supervisor: { email: 'supervisor@factory.com', password: 'supervisor123' },
      operator: { email: 'operator1@factory.com', password: 'operator123' },
    }
    setEmail(creds[role].email)
    setPassword(creds[role].password)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #0a0e1a 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '10%', left: '10%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '72px', height: '72px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            boxShadow: '0 8px 32px rgba(59,130,246,0.35)',
            marginBottom: '1rem', fontSize: '2rem',
          }}>
            🏭
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e8eef7', marginBottom: '0.25rem' }}>
            AssemblyTrack
          </h1>
          <p style={{ color: '#8ba0c0', fontSize: '0.9rem' }}>
            System Pelacakan Lini Perakitan
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: '#1a2235',
          border: '1px solid #2a3a5c',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e8eef7', marginBottom: '1.5rem' }}>
            Masuk ke Akun Anda
          </h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="operator@factory.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.8s linear infinite',
                  }} />
                  Memproses...
                </>
              ) : (
                '🔐 Masuk'
              )}
            </button>
          </form>

          {/* Quick login buttons for demo */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #2a3a5c', paddingTop: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#5a728a', textAlign: 'center', marginBottom: '0.75rem' }}>
              Demo — Login cepat:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['admin', 'supervisor', 'operator'].map((role) => (
                <button
                  key={role}
                  onClick={() => loginAs(role)}
                  className="btn btn-outline"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '0.5rem' }}
                >
                  {role === 'admin' ? '👑' : role === 'supervisor' ? '🔍' : '🔧'}{' '}
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: '#5a728a' }}>
          © 2024 AssemblyTrack — Manufacturing Intelligence System
        </p>
      </div>
    </div>
  )
}
