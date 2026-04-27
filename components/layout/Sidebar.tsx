'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
  { href: '/dashboard/scan', label: 'Scanner QR', icon: '📷', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
  { href: '/dashboard/units', label: 'Unit Produksi', icon: '📦', roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
  { href: '/dashboard/stations', label: 'Stasiun', icon: '🏭', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/dashboard/products', label: 'Produk', icon: '🔩', roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/dashboard/reports', label: 'Laporan', icon: '📈', roles: ['ADMIN', 'SUPERVISOR'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const userRole = session?.user?.role || 'OPERATOR'

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole))

  const roleColor = {
    ADMIN: '#8b5cf6',
    SUPERVISOR: '#3b82f6',
    OPERATOR: '#10b981',
  }[userRole] || '#8ba0c0'

  const roleLabel = { ADMIN: 'Administrator', SUPERVISOR: 'Supervisor', OPERATOR: 'Operator' }[userRole]

  return (
    <>
      {/* Mobile top bar */}
      <div style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: '#111827', borderBottom: '1px solid #2a3a5c',
        padding: '0.75rem 1rem', alignItems: 'center', justifyContent: 'space-between',
      }} className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🏭</span>
          <span style={{ fontWeight: 700, color: '#e8eef7', fontSize: '1rem' }}>AssemblyTrack</span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', color: '#8ba0c0', cursor: 'pointer', fontSize: '1.25rem' }}
        >
          {collapsed ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? '72px' : '240px',
        minHeight: '100vh',
        background: '#111827',
        borderRight: '1px solid #2a3a5c',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{
          padding: '1.25rem 1rem',
          borderBottom: '1px solid #2a3a5c',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem',
          }}>🏭</div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#e8eef7' }}>AssemblyTrack</div>
              <div style={{ fontSize: '0.7rem', color: '#5a728a' }}>v1.0 Production</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: '#5a728a', cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0,
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflow: 'auto' }}>
          {filteredNav.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  marginBottom: '0.25rem',
                  textDecoration: 'none',
                  color: isActive ? '#e8eef7' : '#8ba0c0',
                  background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div style={{ borderTop: '1px solid #2a3a5c', padding: '0.75rem' }}>
          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem', borderRadius: '8px', marginBottom: '0.5rem',
              background: 'rgba(255,255,255,0.03)',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700, color: 'white',
              }}>
                {session?.user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e8eef7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session?.user?.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: roleColor, fontWeight: 600 }}>{roleLabel}</div>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#8ba0c0', fontSize: '0.8rem', transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { (e.target as any).style.background = 'rgba(239,68,68,0.1)'; (e.target as any).style.color = '#ef4444' }}
            onMouseLeave={(e) => { (e.target as any).style.background = 'none'; (e.target as any).style.color = '#8ba0c0' }}
          >
            <span>🚪</span>
            {!collapsed && 'Keluar'}
          </button>
        </div>
      </aside>
    </>
  )
}
