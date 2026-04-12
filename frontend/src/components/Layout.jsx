import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { clearToken, api } from '../lib/api'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', group: 'Utama', icon: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/> },
  { to: '/gallery', label: 'Galeri Foto', group: 'Utama', icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></> },
  { to: '/booths', label: 'Kelola Booth', group: 'Manajemen', icon: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/></> },
  { to: '/frames', label: 'Frame & Template', group: 'Manajemen', icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></> },
  { to: '/analytics', label: 'Report Analitik', group: 'Laporan', icon: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></> },
  { to: '/settings', label: 'Pengaturan', group: 'Sistem', icon: <><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></> },
]

export default function Layout() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    api.auth.me().then(setAdmin).catch(() => {})
  }, [])

  const logout = () => {
    clearToken()
    navigate('/login')
  }

  const groups = [...new Set(NAV.map(n => n.group))]

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-box">
            <svg viewBox="0 0 24 24">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div>
            <div className="logo-name">MEMORIBOOTH</div>
            <div className="logo-sub">Server Panel</div>
          </div>
        </div>

        {groups.map(group => (
          <div className="nav-group" key={group}>
            <div className="nav-group-label">{group}</div>
            {NAV.filter(n => n.group === group).map(n => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">{n.icon}</svg>
                {n.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div style={{ marginTop: 'auto', padding: '1rem 0.5rem', borderTop: '1px solid var(--border)' }}>
          {admin && (
            <div style={{ padding: '8px 10px', marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{admin.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{admin.email}</div>
            </div>
          )}
          <button className="nav-link" style={{ width: '100%', background: 'none', border: 'none', color: 'var(--danger)' }} onClick={logout}>
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'currentColor', fill: 'none', width: 16, height: 16, strokeWidth: 2 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <div className="main-area">
        <Outlet />
      </div>
    </div>
  )
}
