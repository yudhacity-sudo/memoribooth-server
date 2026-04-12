import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']

function exportCSV(data, filename) {
  if (!data.length) return
  const keys = Object.keys(data[0])
  const csv = [keys.join(','), ...data.map(r => keys.map(k => r[k]).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
}

export default function Analytics() {
  const [tab, setTab] = useState('monthly')
  const [summary, setSummary] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [daily, setDaily] = useState([])
  const [boothStats, setBoothStats] = useState([])
  const [peakHours, setPeakHours] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.analytics.summary(),
      api.analytics.booths(),
      api.analytics.peakHours(),
    ]).then(([s, b, p]) => {
      setSummary(s)
      setBoothStats(b)
      const hours = Array.from({ length: 24 }, (_, i) => {
        const found = p.find(r => parseInt(r.hour) === i)
        return { hour: `${String(i).padStart(2,'0')}:00`, sessions: found ? found.sessions : 0 }
      })
      setPeakHours(hours)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    if (tab === 'monthly' || tab === 'peak') {
      api.analytics.monthly(year).then(data => {
        const chart = MONTHS.map((name, i) => {
          const found = data.find(r => parseInt(r.month) === i + 1)
          return { name, sessions: found ? found.sessions : 0, photos: found ? found.photos : 0 }
        })
        setMonthly(chart)
        setLoading(false)
      })
    } else if (tab === 'daily') {
      api.analytics.daily(year, month).then(data => {
        const chart = data.map(r => ({
          ...r,
          date: new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        }))
        setDaily(chart)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [tab, year, month])

  const maxBooth = Math.max(...boothStats.map(b => b.total_sessions), 1)

  return (
    <>
      <div className="topbar">
        <span style={{ fontWeight: 700, fontSize: 16 }}>Report Analitik</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" style={{ width: 'auto', fontSize: 12, padding: '5px 10px' }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(tab === 'daily' ? daily : monthly, `memoribooth-${tab}-${year}.csv`)}>
            ↓ Export CSV
          </button>
        </div>
      </div>
      <div className="content">
        {/* Summary cards */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
          <div className="stat-card">
            <div className="stat-label">Sesi Hari Ini</div>
            <div className="stat-value">{summary?.today?.sessions ?? '—'}</div>
            <div className="stat-sub">{summary?.today?.photos ?? 0} foto</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sesi Bulan Ini</div>
            <div className="stat-value">{summary?.month?.sessions ?? '—'}</div>
            <div className="stat-sub">{summary?.month?.photos ?? 0} foto</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Frame Terpopuler</div>
            <div className="stat-value" style={{ fontSize: 16, paddingTop: 6 }}>{summary?.top_frame?.name ?? '—'}</div>
            <div className="stat-sub">{summary?.top_frame?.count ?? 0} kali dipakai bulan ini</div>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 4, width: 'fit-content' }}>
          {[
            { key: 'monthly', label: 'Bulanan' },
            { key: 'daily', label: 'Harian' },
            { key: 'booths', label: 'Per Booth' },
            { key: 'peak', label: 'Jam Sibuk' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'var(--font)', background: tab === t.key ? 'var(--accent)' : 'transparent', color: tab === t.key ? 'white' : 'var(--text-2)', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Monthly chart */}
        {tab === 'monthly' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Sesi & Foto per Bulan — {year}</span>
            </div>
            {loading ? <div className="skeleton" style={{ height: 240 }} /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sessions" fill="#7C3AED" radius={[4,4,0,0]} name="Sesi" />
                  <Bar dataKey="photos" fill="#A78BFA" radius={[4,4,0,0]} name="Foto" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Daily chart */}
        {tab === 'daily' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Sesi Harian</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select className="form-select" style={{ width: 'auto', fontSize: 12, padding: '4px 10px' }} value={month} onChange={e => setMonth(e.target.value)}>
                  {MONTHS.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                </select>
              </div>
            </div>
            {loading ? <div className="skeleton" style={{ height: 240 }} /> : daily.length === 0 ? (
              <div className="empty-state"><p>Tidak ada data untuk periode ini</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={daily} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="sessions" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} name="Sesi" />
                  <Line type="monotone" dataKey="photos" stroke="#A78BFA" strokeWidth={2} dot={{ r: 3 }} name="Foto" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Daily table */}
            {!loading && daily.length > 0 && (
              <div className="table-wrap" style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <table>
                  <thead><tr>
                    <th>Tanggal</th><th>Sesi</th><th>Foto</th><th>Booth Aktif</th>
                  </tr></thead>
                  <tbody>
                    {daily.map((r, i) => (
                      <tr key={i}>
                        <td>{r.date}</td>
                        <td style={{ fontWeight: 600 }}>{r.sessions}</td>
                        <td>{r.photos}</td>
                        <td>{r.active_booths} booth</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Per booth */}
        {tab === 'booths' && (
          <div className="card">
            <div className="card-header"><span className="card-title">Performa per Booth</span></div>
            {boothStats.length === 0 ? (
              <div className="empty-state"><p>Belum ada data booth</p></div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1.5rem' }}>
                  {boothStats.map(b => (
                    <div key={b.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.status === 'online' ? 'var(--success)' : 'var(--danger)' }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.location}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{b.total_sessions} sesi</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(b.total_sessions / maxBooth) * 100}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{b.total_photos} foto · Hari ini: {b.today_sessions} sesi</div>
                    </div>
                  ))}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Booth</th><th>Lokasi</th><th>Total Sesi</th><th>Total Foto</th><th>Hari Ini</th><th>Status</th></tr></thead>
                    <tbody>
                      {boothStats.map(b => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600 }}>{b.name}</td>
                          <td style={{ color: 'var(--text-2)' }}>{b.location || '-'}</td>
                          <td>{b.total_sessions}</td>
                          <td>{b.total_photos}</td>
                          <td>{b.today_sessions}</td>
                          <td><span className={`badge badge-${b.status === 'online' ? 'online' : 'offline'}`}>{b.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Peak hours */}
        {tab === 'peak' && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Jam Sibuk (30 hari terakhir)</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={peakHours} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                <Bar dataKey="sessions" fill="#7C3AED" radius={[3,3,0,0]} name="Sesi" />
              </BarChart>
            </ResponsiveContainer>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: '0.75rem' }}>Grafik menunjukkan distribusi sesi per jam dalam 30 hari terakhir dari semua booth.</p>
          </div>
        )}
      </div>
    </>
  )
}
