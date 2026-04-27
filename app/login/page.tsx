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
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setError('Email atau password salah.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const loginAs = (role: string) => {
    const creds: Record<string, { email: string; password: string }> = {
      admin:      { email: 'admin@factory.com',      password: 'admin123' },
      supervisor: { email: 'supervisor@factory.com', password: 'supervisor123' },
      operator:   { email: 'operator1@factory.com',  password: 'operator123' },
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
      background: 'var(--bg)',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '10px',
            background: 'var(--blue-dim)',
            border: '1px solid rgba(56,139,253,0.3)',
            fontSize: '1.5rem', marginBottom: '0.75rem',
          }}>🏭</div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
            AssemblyTrack
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            System Pelacakan Lini Perakitan
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.75rem' }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="user@factory.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.625rem', marginTop: '0.25rem' }}
              disabled={loading}
            >
              {loading ? (
                <span style={{
                  width: '14px', height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.8s linear infinite',
                }} />
              ) : 'Masuk'}
            </button>
          </form>

          {/* Demo quick login */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', textAlign: 'center', marginBottom: '0.625rem' }}>
              Demo login cepat
            </p>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {['admin', 'supervisor', 'operator'].map(role => (
                <button
                  key={role}
                  onClick={() => loginAs(role)}
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1, fontSize: '0.6875rem' }}
                >
                  {role === 'admin' ? '👑' : role === 'supervisor' ? '🔍' : '🔧'}
                  {' '}{role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
          © 2024 AssemblyTrack
        </p>
      </div>
    </div>
  )
}
