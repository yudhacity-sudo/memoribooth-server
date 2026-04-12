import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

function FrameModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'strip-2x', slots: 4, booth_ids: 'all' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('type', form.type)
      fd.append('slots', form.slots)
      fd.append('booth_ids', form.booth_ids)
      if (file) fd.append('file', file)
      await api.frames.create(fd)
      onSave()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Upload Frame Baru</div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Nama Frame *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="cth: Classic Strip Pink" />
          </div>
          <div className="grid-2" style={{ gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Tipe</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                <option value="strip-2x">Strip 2x</option>
                <option value="strip-4x">Strip 4x</option>
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Jumlah Slot Foto</label>
              <input className="form-input" type="number" min="1" max="12" value={form.slots} onChange={e => setForm(f => ({...f, slots: parseInt(e.target.value)}))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tersedia untuk Booth</label>
            <select className="form-select" value={form.booth_ids} onChange={e => setForm(f => ({...f, booth_ids: e.target.value}))}>
              <option value="all">Semua Booth</option>
            </select>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Saat ini: semua booth. Bisa dikustomisasi per booth di versi selanjutnya.</div>
          </div>
          <div className="form-group">
            <label className="form-label">File Frame (PNG/JPG, maks 20MB)</label>
            <input className="form-input" type="file" accept="image/png,image/jpeg" onChange={e => setFile(e.target.files[0])} required />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Mengupload...' : 'Upload Frame'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Frames() {
  const [frames, setFrames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    api.frames.list().then(setFrames).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleActive = async (frame) => {
    await api.frames.update(frame.id, { is_active: frame.is_active ? 0 : 1 })
    load()
  }

  const deleteFrame = async (frame) => {
    if (!confirm(`Hapus frame "${frame.name}"?`)) return
    await api.frames.delete(frame.id)
    load()
  }

  const TYPES = ['all', 'strip-2x', 'strip-4x', 'landscape', 'portrait', 'custom']
  const filtered = filter === 'all' ? frames : frames.filter(f => f.type === filter)

  const typeColors = {
    'strip-2x': '#EDE9FE', 'strip-4x': '#DBEAFE',
    'landscape': '#DCFCE7', 'portrait': '#FCE7F3', 'custom': '#FEF3C7'
  }

  return (
    <>
      <div className="topbar">
        <span style={{ fontWeight: 700, fontSize: 16 }}>Frame & Template</span>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload Frame
        </button>
      </div>
      <div className="content">
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: filter === t ? 'var(--accent)' : 'var(--bg-card)', color: filter === t ? 'white' : 'var(--text-2)', fontFamily: 'var(--font)' }}>
              {t === 'all' ? 'Semua' : t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid-4">{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 200 }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">🖼️</div><p>Belum ada frame. Upload frame pertama kamu!</p></div></div>
        ) : (
          <div className="grid-4">
            {filtered.map(frame => (
              <div key={frame.id} style={{ background: 'var(--bg-card)', border: `1px solid ${frame.is_active ? 'var(--border)' : '#FECACA'}`, borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)', opacity: frame.is_active ? 1 : 0.6 }}>
                <div style={{ height: 150, background: typeColors[frame.type] || '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {frame.filename ? (
                    <img src={`/api/frame-images/${frame.filename}`} alt={frame.name}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                      onError={e => { e.target.style.display = 'none' }} />
                  ) : null}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', position: 'absolute' }}>
                    {Array.from({ length: Math.min(frame.slots, 4) }, (_, i) => (
                      <div key={i} style={{ width: 54, height: 16, background: 'white', opacity: 0.5, borderRadius: 2 }} />
                    ))}
                  </div>
                  {!frame.is_active && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: '#FEE2E2', color: '#991B1B', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Nonaktif</div>
                  )}
                </div>
                <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{frame.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>{frame.type} · {frame.slots} slot</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => toggleActive(frame)}>
                      {frame.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteFrame(frame)}>Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal && <FrameModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load() }} />}
    </>
  )
}
