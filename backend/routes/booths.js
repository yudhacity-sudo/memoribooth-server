const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/booths
router.get('/', (req, res) => {
  const booths = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM sessions s WHERE s.booth_id = b.id) AS total_sessions,
      (SELECT COUNT(*) FROM sessions s WHERE s.booth_id = b.id AND DATE(s.created_at) = DATE('now')) AS sessions_today,
      (SELECT COUNT(*) FROM sessions s 
        JOIN photos p ON p.session_id = s.id 
        WHERE s.booth_id = b.id) AS total_photos
    FROM booths b ORDER BY b.created_at DESC
  `).all();
  res.json(booths);
});

// POST /api/booths
router.post('/', (req, res) => {
  const { name, location, max_sessions_per_day } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama booth wajib diisi' });
  const api_key = 'MB-' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 20);
  const result = db.prepare(
    'INSERT INTO booths (name, location, api_key, max_sessions_per_day) VALUES (?, ?, ?, ?)'
  ).run(name, location || '', api_key, max_sessions_per_day || 0);
  const booth = db.prepare('SELECT * FROM booths WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(booth);
});

// GET /api/booths/:id
router.get('/:id', (req, res) => {
  const booth = db.prepare('SELECT * FROM booths WHERE id = ?').get(req.params.id);
  if (!booth) return res.status(404).json({ error: 'Booth tidak ditemukan' });
  res.json(booth);
});

// PUT /api/booths/:id
router.put('/:id', (req, res) => {
  const { name, location, max_sessions_per_day, status } = req.body;
  const booth = db.prepare('SELECT * FROM booths WHERE id = ?').get(req.params.id);
  if (!booth) return res.status(404).json({ error: 'Booth tidak ditemukan' });
  db.prepare(`
    UPDATE booths SET name = ?, location = ?, max_sessions_per_day = ?, status = ? WHERE id = ?
  `).run(
    name || booth.name,
    location !== undefined ? location : booth.location,
    max_sessions_per_day !== undefined ? max_sessions_per_day : booth.max_sessions_per_day,
    status || booth.status,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM booths WHERE id = ?').get(req.params.id));
});

// DELETE /api/booths/:id
router.delete('/:id', (req, res) => {
  const booth = db.prepare('SELECT * FROM booths WHERE id = ?').get(req.params.id);
  if (!booth) return res.status(404).json({ error: 'Booth tidak ditemukan' });
  db.prepare('DELETE FROM booths WHERE id = ?').run(req.params.id);
  res.json({ message: 'Booth berhasil dihapus' });
});

// GET /api/booths/:id/regenerate-key
router.post('/:id/regenerate-key', (req, res) => {
  const new_key = 'MB-' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 20);
  db.prepare('UPDATE booths SET api_key = ? WHERE id = ?').run(new_key, req.params.id);
  res.json({ api_key: new_key });
});

module.exports = router;
