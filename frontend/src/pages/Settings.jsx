import React, { useState } from 'react'
import { api } from '../lib/api'

export default function Settings() {
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const changePassword = async (e) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) return setPwMsg({ type: 'error', text: 'Password baru tidak cocok' })
    if (pw.next.length < 8) return setPwMsg({ type: 'error', text: 'Password minimal 8 karakter' })
    setLoading(true); setPwMsg(null)
    try {
      await api.auth.changePassword(pw.current, pw.next)
      setPwMsg({ type: 'success', text: 'Password berhasil diubah!' })
      setPw({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message })
    } finally { setLoading(false) }
  }

  return (
    <>
      <div className="topbar">
        <span style={{ fontWeight: 700, fontSize: 16 }}>Pengaturan</span>
      </div>
      <div className="content">
        <div style={{ maxWidth: 640 }}>

          {/* App info */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-title" style={{ marginBottom: '1rem' }}>Informasi Aplikasi</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Nama Aplikasi', val: 'MEMORIBOOTH Server' },
                { label: 'Versi', val: 'v1.0.0' },
                { label: 'Database', val: 'SQLite (better-sqlite3)' },
                { label: 'Storage', val: 'Local VPS — /backend/uploads/' },
                { label: 'Runtime', val: 'Node.js + Express' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 160, fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* API endpoint info */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-title" style={{ marginBottom: '0.5rem' }}>Endpoint untuk Booth PC</div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1rem' }}>Gunakan endpoint berikut di aplikasi booth kamu untuk upload foto:</p>
            <div style={{ background: '#1a1523', borderRadius: 'var(--radius-sm)', padding: '1rem', fontFamily: 'monospace', fontSize: 12, color: '#A78BFA', marginBottom: 12 }}>
              <div style={{ color: '#6B7280', marginBottom: 8 }}># Upload sesi foto</div>
              <div>POST <span style={{ color: '#DDD6FE' }}>https://yourdomain.com/api/sessions/upload</span></div>
              <div style={{ marginTop: 8, color: '#6B7280' }}># Header wajib</div>
              <div>x-api-key: <span style={{ color: '#86EFAC' }}>MB-XXXX (dari panel Kelola Booth)</span></div>
              <div style={{ marginTop: 8, color: '#6B7280' }}># Body (multipart/form-data)</div>
              <div>photos[]: <span style={{ color: '#FCD34D' }}>file (bisa banyak)</span></div>
              <div>frame_id: <span style={{ color: '#FCD34D' }}>1 (opsional)</span></div>
              <div style={{ marginTop: 8, color: '#6B7280' }}># Ambil daftar frame</div>
              <div>GET <span style={{ color: '#DDD6FE' }}>https://yourdomain.com/api/frames</span></div>
              <div style={{ marginTop: 4 }}>x-api-key: <span style={{ color: '#86EFAC' }}>MB-XXXX</span></div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Response berisi <code style={{ background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 4 }}>session_code</code> untuk halaman download QR tamu.</p>
          </div>

          {/* Guest download info */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-title" style={{ marginBottom: '0.5rem' }}>Halaman Download Tamu</div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '0.75rem' }}>Setelah upload berhasil, tamu bisa download foto via link:</p>
            <div style={{ background: '#1a1523', borderRadius: 'var(--radius-sm)', padding: '1rem', fontFamily: 'monospace', fontSize: 12, color: '#A78BFA' }}>
              GET https://yourdomain.com/api/sessions/<span style={{ color: '#86EFAC' }}>{'{'} session_code {'}'}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>Tampilkan QR code dari URL ini di layar booth setelah sesi selesai.</p>
          </div>

          {/* Change password */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '1rem' }}>Ganti Password Admin</div>
            {pwMsg && <div className={`alert alert-${pwMsg.type === 'error' ? 'error' : 'success'}`}>{pwMsg.text}</div>}
            <form onSubmit={changePassword}>
              <div className="form-group">
                <label className="form-label">Password Lama</label>
                <input type="password" className="form-input" value={pw.current} onChange={e => setPw(p => ({...p, current: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password Baru (min. 8 karakter)</label>
                <input type="password" className="form-input" value={pw.next} onChange={e => setPw(p => ({...p, next: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Konfirmasi Password Baru</label>
                <input type="password" className="form-input" value={pw.confirm} onChange={e => setPw(p => ({...p, confirm: e.target.value}))} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Menyimpan...' : 'Ganti Password'}</button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
