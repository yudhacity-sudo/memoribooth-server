import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']

function fmtBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [sessions, setSessions] = useState([])
  const [boothStats, setBoothStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const year = new Date().getFullYear()
    Promise.all([
      api.analytics.summary(),
      api.analytics.monthly(year),
      api.sessions.list({ limit: 8 }),
      api.analytics.booths(),
    ]).then(([s, m, sess, b]) => {
      setSummary(s)
      const chart = MONTHS.map((name, i) => {
        const found = m.find(r => parseInt(r.month) === i + 1)
        return { name, sessions: found ? found.sessions : 0 }
      })
      setMonthly(chart)
      setSessions(sess.sessions || [])
      setBoothStats(b)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ padding: '1.5rem' }}>
      <div className="stats-grid">{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}</div>
    </div>
  )

  return (
    <>
      <div className="topbar">
        <span style={{ fontWeight: 700, fontSize: 16 }}>Dashboard</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div className="content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Sesi Hari Ini</div>
            <div className="stat-value">{summary?.today?.sessions ?? 0}</div>
            <div className="stat-sub">{summary?.today?.photos ?? 0} foto diambil</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sesi Bulan Ini</div>
            <div className="stat-value">{summary?.month?.sessions ?? 0}</div>
            <div className="stat-sub">{summary?.month?.photos ?? 0} total foto</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Booth Aktif</div>
            <div className="stat-value">{summary?.active_booths ?? 0}</div>
            <div className="stat-sub">dari {boothStats.length} terdaftar</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Storage Terpakai</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{fmtBytes(summary?.storage_bytes ?? 0)}</div>
            <div className="stat-sub">dari 50 GB tersedia</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: '1rem' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Sesi per Bulan {new Date().getFullYear()}</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                <Bar dataKey="sessions" fill="#7C3AED" radius={[4,4,0,0]} name="Sesi" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Status Booth</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {boothStats.length === 0 && <div className="empty-state"><p>Belum ada booth terdaftar</p></div>}
              {boothStats.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.status === 'online' ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.location || 'Lokasi tidak diset'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.today_sessions}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>sesi hari ini</div>
                  </div>
                  <span className={`badge badge-${b.status === 'online' ? 'online' : 'offline'}`}>{b.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Sesi Terbaru</span>
          </div>
          {sessions.length === 0 ? (
            <div className="empty-state"><p>Belum ada sesi foto</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Kode Sesi</th><th>Booth</th><th>Frame</th>
                  <th>Foto</th><th>Waktu</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4 }}>{s.session_code}</span></td>
                      <td>{s.booth_name}</td>
                      <td>{s.frame_name || '-'}</td>
                      <td>{s.photo_count} foto</td>
                      <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{new Date(s.created_at).toLocaleString('id-ID')}</td>
                      <td><span className={`badge badge-${s.status === 'completed' ? 'online' : 'warning'}`}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
