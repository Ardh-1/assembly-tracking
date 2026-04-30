'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Factory, LogIn, AlertTriangle, Shield, Eye, Wrench, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export default function LoginPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
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

  const roleButtons = [
    { role: 'admin', label: 'Admin', Icon: Shield, color: '#8b5cf6' },
    { role: 'supervisor', label: 'Supervisor', Icon: Eye, color: '#3b82f6' },
    { role: 'operator', label: 'Operator', Icon: Wrench, color: '#10b981' },
  ]

  const isDark = theme === 'dark'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDark
        ? 'linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #0a0e1a 100%)'
        : 'linear-gradient(135deg, #e0e9f7 0%, #f1f5fb 50%, #dce6f5 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 0.3s ease',
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

      {/* ===== THEME TOGGLE (floating top-right) ===== */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.9rem',
          borderRadius: '999px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
          color: isDark ? '#e8eef7' : '#1e293b',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 600,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.1)',
          transition: 'all 0.25s ease',
          zIndex: 50,
        }}
      >
        {isDark
          ? <><Sun size={15} color="#f59e0b" /> Light Mode</>
          : <><Moon size={15} color="#6366f1" /> Dark Mode</>}
      </button>

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '72px', height: '72px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            boxShadow: '0 8px 32px rgba(59,130,246,0.35)',
            marginBottom: '1rem',
          }}>
            <Factory size={32} color="white" />
          </div>
          <h1 style={{
            fontSize: '1.75rem', fontWeight: 800,
            color: isDark ? '#e8eef7' : '#0f172a',
            marginBottom: '0.25rem',
          }}>
            AssemblyTrack
          </h1>
          <p style={{ color: isDark ? '#8ba0c0' : '#64748b', fontSize: '0.9rem' }}>
            System Pelacakan Lini Perakitan
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: isDark ? '#1a2235' : '#ffffff',
          border: `1px solid ${isDark ? '#2a3a5c' : '#e2e8f0'}`,
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: isDark
            ? '0 24px 64px rgba(0,0,0,0.5)'
            : '0 24px 64px rgba(0,0,0,0.08)',
          transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        }}>
          <h2 style={{
            fontSize: '1.1rem', fontWeight: 700,
            color: isDark ? '#e8eef7' : '#0f172a',
            marginBottom: '1.5rem',
          }}>
            Masuk ke Akun Anda
          </h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <AlertTriangle size={16} />
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
                <>
                  <LogIn size={16} />
                  Masuk
                </>
              )}
            </button>
          </form>

          {/* Quick login buttons for demo */}
          <div style={{
            marginTop: '1.5rem',
            borderTop: `1px solid ${isDark ? '#2a3a5c' : '#e2e8f0'}`,
            paddingTop: '1.5rem',
          }}>
            <p style={{
              fontSize: '0.75rem',
              color: isDark ? '#5a728a' : '#94a3b8',
              textAlign: 'center', marginBottom: '0.75rem',
            }}>
              Demo — Login cepat:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {roleButtons.map(({ role, label, Icon, color }) => (
                <button
                  key={role}
                  onClick={() => loginAs(role)}
                  className="btn btn-outline"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '0.5rem', gap: '0.3rem' }}
                >
                  <Icon size={13} color={color} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{
          textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem',
          color: isDark ? '#5a728a' : '#94a3b8',
        }}>
          © 2024 AssemblyTrack — Manufacturing Intelligence System
        </p>
      </div>
    </div>
  )
}
