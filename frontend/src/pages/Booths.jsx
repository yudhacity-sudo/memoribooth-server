import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

function BoothModal({ booth, onClose, onSave }) {
  const [form, setForm] = useState({ name: booth?.name || '', location: booth?.location || '', max_sessions_per_day: booth?.max_sessions_per_day || 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      if (booth) await api.booths.update(booth.id, form)
      else await api.booths.create(form)
      onSave()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{booth ? 'Edit Booth' : 'Tambah Booth Baru'}</div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Nama Booth *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="cth: MEMORIBOOTH Jakarta" />
          </div>
          <div className="form-group">
            <label className="form-label">Lokasi</label>
            <input className="form-input" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="cth: Mall Grand Indonesia, Jakarta" />
          </div>
          <div className="form-group">
            <label className="form-label">Batas Sesi per Hari (0 = tidak terbatas)</label>
            <input className="form-input" type="number" min="0" value={form.max_sessions_per_day} onChange={e => setForm(f => ({...f, max_sessions_per_day: parseInt(e.target.value)}))} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ApiKeyModal({ booth, onClose }) {
  const [key, setKey] = useState(booth.api_key)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const regen = async () => {
    if (!confirm('Booth akan terputus sampai pakai API key baru. Lanjutkan?')) return
    setLoading(true)
    const data = await api.booths.regenerateKey(booth.id)
    setKey(data.api_key)
    setLoading(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(key)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">API Key — {booth.name}</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1rem' }}>Gunakan API key ini di aplikasi booth PC untuk menghubungkan ke server.</p>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', marginBottom: '1rem' }}>
          {key}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={copy}>{copied ? '✓ Tersalin!' : 'Salin API Key'}</button>
          <button className="btn btn-secondary" onClick={regen} disabled={loading}>{loading ? '...' : 'Regenerasi'}</button>
          <button className="btn btn-secondary" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}

export default function Booths() {
  const [booths, setBooths] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editBooth, setEditBooth] = useState(null)
  const [keyBooth, setKeyBooth] = useState(null)

  const load = () => {
    setLoading(true)
    api.booths.list().then(setBooths).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const deleteBooth = async (b) => {
    if (!confirm(`Hapus booth "${b.name}"? Semua sesi akan ikut terhapus.`)) return
    await api.booths.delete(b.id)
    load()
  }

  return (
    <>
      <div className="topbar">
        <span style={{ fontWeight: 700, fontSize: 16 }}>Kelola Booth</span>
        <button className="btn btn-primary" onClick={() => { setEditBooth(null); setShowModal(true) }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah Booth
        </button>
      </div>
      <div className="content">
        {loading ? (
          <div className="grid-2">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}</div>
        ) : booths.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">📷</div><p>Belum ada booth. Tambah booth pertama kamu!</p></div></div>
        ) : (
          <div className="grid-2">
            {booths.map(b => (
              <div className="card" key={b.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.status === 'online' ? 'var(--success)' : 'var(--danger)' }} />
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</span>
                      <span className={`badge badge-${b.status === 'online' ? 'online' : 'offline'}`}>{b.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                      {b.location || 'Lokasi tidak diset'} · Terdaftar {new Date(b.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Total Sesi', val: b.total_sessions },
                    { label: 'Hari Ini', val: b.sessions_today },
                    { label: 'Total Foto', val: b.total_photos },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {b.max_sessions_per_day > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>Batas sesi/hari: {b.max_sessions_per_day}</div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setKeyBooth(b)}>🔑 API Key</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditBooth(b); setShowModal(true) }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteBooth(b)}>Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <BoothModal booth={editBooth} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load() }} />
      )}
      {keyBooth && <ApiKeyModal booth={keyBooth} onClose={() => { setKeyBooth(null); load() }} />}
    </>
  )
}
