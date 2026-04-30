'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import {
  LayoutDashboard, QrCode, Package, Cpu, Wrench,
  BarChart2, LogOut, ChevronRight, ChevronLeft,
  Shield, Eye, Factory,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/dashboard/scan', label: 'Scanner QR', icon: QrCode, roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'] },
  { href: '/dashboard/units', label: 'Unit Produksi', icon: Package, roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/dashboard/stations', label: 'Stasiun', icon: Cpu, roles: ['ADMIN'] },
  { href: '/dashboard/products', label: 'Produk', icon: Wrench, roles: ['ADMIN'] },
  { href: '/dashboard/reports', label: 'Laporan', icon: BarChart2, roles: ['ADMIN', 'SUPERVISOR'] },
]

const roleIcons: Record<string, React.ElementType> = {
  ADMIN: Shield,
  SUPERVISOR: Eye,
  OPERATOR: Wrench,
}

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
  const RoleIcon = roleIcons[userRole] || Wrench

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className="desktop-sidebar"
        style={{
          width: collapsed ? '64px' : '240px',
          minHeight: '100vh',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s ease, background 0.25s ease, border-color 0.25s ease',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Brand */}
        <div style={{
          padding: collapsed ? '1.1rem 0.75rem' : '1.1rem 1rem',
          borderBottom: '1px solid var(--sidebar-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          overflow: 'hidden',
          minHeight: '64px',
          transition: 'padding 0.25s ease',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Factory size={18} color="white" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>AssemblyTrack</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>v1.0 Production</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0.625rem 0.5rem', overflowY: 'auto', overflowX: 'hidden' }}>
          {filteredNav.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: collapsed ? '0.65rem' : '0.65rem 0.75rem',
                  borderRadius: '8px',
                  marginBottom: '0.2rem',
                  textDecoration: 'none',
                  color: active ? 'var(--nav-active-border)' : 'var(--text-secondary)',
                  background: active ? 'var(--nav-active-bg)' : 'transparent',
                  borderLeft: `3px solid ${active ? 'var(--nav-active-border)' : 'transparent'}`,
                  fontWeight: active ? 600 : 400,
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div style={{ borderTop: '1px solid var(--sidebar-border)', padding: '0.75rem' }}>
          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem', borderRadius: '8px', marginBottom: '0.5rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
              }}>
                <RoleIcon size={14} />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session?.user?.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: roleColor, fontWeight: 600 }}>{roleLabel}</div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Keluar"
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '0.8rem', transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <LogOut size={16} />
            {!collapsed && 'Keluar'}
          </button>
        </div>
      </aside>

      {/* ===== COLLAPSE TOGGLE — floating at sidebar edge ===== */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
        className="desktop-sidebar"
        style={{
          position: 'fixed',
          top: '50%',
          left: collapsed ? '48px' : '224px',
          transform: 'translateY(-50%)',
          width: '22px',
          height: '48px',
          borderRadius: '0 8px 8px 0',
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--sidebar-border)',
          borderLeft: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          zIndex: 100,
          transition: 'left 0.25s ease, background 0.25s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-blue)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* ===== MOBILE TOP BAR ===== */}
      <div className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Factory size={16} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1 }}>AssemblyTrack</div>
            <div style={{ fontSize: '0.65rem', color: roleColor, fontWeight: 600 }}>{roleLabel}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
          }}>
            <RoleIcon size={13} />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '8px', padding: '0.35rem 0.6rem', color: '#ef4444',
              fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            <LogOut size={13} />
            Keluar
          </button>
        </div>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="mobile-bottom-nav">
        {filteredNav.slice(0, 5).map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${active ? 'active' : ''}`}
            >
              <Icon size={22} className="mobile-nav-icon" />
              <span className="mobile-nav-label">{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
