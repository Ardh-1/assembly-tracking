'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const navItems = [
  { href: '/dashboard',          label: 'Dashboard',   icon: '⬛', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/dashboard/scan',     label: 'Scan',        icon: '📷', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
  { href: '/dashboard/units',    label: 'Unit',        icon: '📦', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/dashboard/stations', label: 'Stasiun',     icon: '🏭', roles: ['ADMIN'] },
  { href: '/dashboard/products', label: 'Produk',      icon: '🔩', roles: ['ADMIN'] },
  { href: '/dashboard/reports',  label: 'Laporan',     icon: '📈', roles: ['ADMIN', 'SUPERVISOR'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = (session?.user?.role as string) || 'OPERATOR'

  const filtered = navItems.filter(item => item.roles.includes(userRole))

  const roleLabel: Record<string, string> = {
    ADMIN: 'Admin',
    SUPERVISOR: 'Supervisor',
    OPERATOR: 'Operator',
  }

  const roleColor: Record<string, string> = {
    ADMIN: 'var(--purple)',
    SUPERVISOR: 'var(--blue)',
    OPERATOR: 'var(--green)',
  }

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="desktop-sidebar" style={{
        width: '200px',
        minHeight: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Brand */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <div style={{
            width: '28px', height: '28px',
            borderRadius: '6px',
            background: 'var(--blue-dim)',
            border: '1px solid rgba(56,139,253,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', flexShrink: 0,
          }}>🏭</div>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>AssemblyTrack</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.5rem' }}>
          {filtered.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.625rem',
                borderRadius: '6px',
                marginBottom: '2px',
                color: isActive(item.href) ? 'var(--text)' : 'var(--text-muted)',
                background: isActive(item.href) ? 'var(--bg-elevated)' : 'transparent',
                fontWeight: isActive(item.href) ? 500 : 400,
                fontSize: '0.8125rem',
                textDecoration: 'none',
                transition: 'all 0.12s ease',
              }}
            >
              <span style={{ fontSize: '0.875rem', opacity: 0.85 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem', borderRadius: '6px', marginBottom: '0.375rem',
          }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: roleColor[userRole] + '22',
              border: `1px solid ${roleColor[userRole]}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: roleColor[userRole], flexShrink: 0,
            }}>
              {session?.user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '0.75rem', fontWeight: 500, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {session?.user?.name}
              </div>
              <div style={{ fontSize: '0.6875rem', color: roleColor[userRole] }}>
                {roleLabel[userRole]}
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.4rem 0.625rem', borderRadius: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.75rem',
              transition: 'all 0.12s ease',
            }}
            onMouseEnter={e => {
              const t = e.currentTarget
              t.style.background = 'var(--red-dim)'
              t.style.color = 'var(--red)'
            }}
            onMouseLeave={e => {
              const t = e.currentTarget
              t.style.background = 'none'
              t.style.color = 'var(--text-muted)'
            }}
          >
            <span>↩</span> Keluar
          </button>
        </div>
      </aside>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="mobile-nav" style={{ gap: '0' }}>
        {filtered.map(item => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '0.375rem 0.25rem',
              borderRadius: '6px',
              color: isActive(item.href) ? 'var(--blue)' : 'var(--text-subtle)',
              textDecoration: 'none',
              fontSize: '0.625rem',
              fontWeight: isActive(item.href) ? 600 : 400,
              background: isActive(item.href) ? 'var(--blue-dim)' : 'transparent',
              transition: 'all 0.12s',
            }}
          >
            <span style={{ fontSize: '1.125rem', lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: '0.375rem 0.25rem',
            borderRadius: '6px',
            color: 'var(--text-subtle)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.625rem',
            fontWeight: 400,
          }}
        >
          <span style={{ fontSize: '1.125rem', lineHeight: 1 }}>↩</span>
          Keluar
        </button>
      </nav>
    </>
  )
}
