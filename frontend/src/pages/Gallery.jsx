import React, { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'

function SessionDetail({ session, onClose, onDelete }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--accent-light)', color: 'var(--accent)', display: 'inline-block', padding: '2px 10px', borderRadius: 4, marginBottom: 4 }}>{session.session_code}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{session.booth_name} · {new Date(session.created_at).toLocaleString('id-ID')}</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(session)}>Hapus Sesi</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: '1rem' }}>
          {(session.photos || []).map(p => (
            <a key={p.id} href={`/api/photos/${p.filename}`} target="_blank" rel="noreferrer">
              <img src={`/api/photos/${p.filename}`} alt=""
                style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                onError={e => { e.target.src = ''; e.target.style.background = 'var(--bg-secondary)' }} />
            </a>
          ))}
          {(!session.photos || session.photos.length === 0) && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>Foto tidak tersedia</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text-2)' }}>
            Frame: {session.frame_name || '-'} · {session.photo_count} foto · Diunduh {session.guest_downloaded}x
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}

export default function Gallery() {
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [booths, setBooths] = useState([])
  const [filters, setFilters] = useState({ booth_id: '', date_from: '', date_to: '' })
  const [selected, setSelected] = useState(null)
  const [detailData, setDetailData] = useState(null)

  const LIMIT = 16

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, limit: LIMIT }
    if (filters.booth_id) params.booth_id = filters.booth_id
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    api.sessions.list(params).then(data => {
      setSessions(data.sessions || [])
      setTotal(data.total || 0)
    }).finally(() => setLoading(false))
  }, [page, filters])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.booths.list().then(setBooths) }, [])

  const openSession = async (s) => {
    setSelected(s)
    const data = await api.sessions.get(s.session_code)
    setDetailData(data)
  }

  const deleteSession = async (s) => {
    if (!confirm(`Hapus sesi ${s.session_code}? Semua foto akan terhapus.`)) return
    await api.sessions.delete(s.id)
    setSelected(null); setDetailData(null)
    load()
  }

  const totalPages = Math.ceil(total / LIMIT)

  const colors = ['#EDE9FE', '#DBEAFE', '#DCFCE7', '#FEF3C7', '#FCE7F3', '#E0E7FF', '#FEE2E2', '#D1FAE5']

  return (
    <>
      <div className="topbar">
        <span style={{ fontWeight: 700, fontSize: 16 }}>Galeri Foto</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{total} sesi ditemukan</span>
      </div>
      <div className="content">
        {/* Filters */}
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, flex: '1 1 160px' }}>
              <label className="form-label">Booth</label>
              <select className="form-select" value={filters.booth_id} onChange={e => { setFilters(f => ({...f, booth_id: e.target.value})); setPage(1) }}>
                <option value="">Semua Booth</option>
                {booths.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
              <label className="form-label">Dari Tanggal</label>
              <input type="date" className="form-input" value={filters.date_from} onChange={e => { setFilters(f => ({...f, date_from: e.target.value})); setPage(1) }} />
            </div>
            <div className="form-group" style={{ margin: 0, flex: '1 1 140px' }}>
              <label className="form-label">Sampai Tanggal</label>
              <input type="date" className="form-input" value={filters.date_to} onChange={e => { setFilters(f => ({...f, date_to: e.target.value})); setPage(1) }} />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ booth_id: '', date_from: '', date_to: '' }); setPage(1) }}>Reset</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">📷</div><p>Belum ada sesi foto yang ditemukan</p></div></div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: '1rem' }}>
              {sessions.map((s, i) => (
                <div key={s.id} onClick={() => openSession(s)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s', boxShadow: 'var(--shadow)' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}>
                  <div style={{ height: 180, background: colors[i % colors.length], overflow: 'hidden', position: 'relative' }}>
                    {s.final_photo ? (
                      <img
                        src={`/api/photos/${s.final_photo}`}
                        alt={s.session_code}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)', marginBottom: 2 }}>{s.session_code}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 2 }}>{s.booth_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {s.photo_count} foto · {new Date(s.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Sebelumnya</button>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Halaman {page} dari {totalPages}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Selanjutnya →</button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <SessionDetail
          session={detailData || selected}
          onClose={() => { setSelected(null); setDetailData(null) }}
          onDelete={deleteSession}
        />
      )}
    </>
  )
}
