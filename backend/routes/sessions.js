const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware, boothApiKey } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(UPLOAD_DIR, date);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// POST /api/sessions/upload  (from booth PC — uses API key)
router.post('/upload', boothApiKey, upload.array('photos', 20), (req, res) => {
  const { frame_id } = req.body;
  const session_code = 'MB' + Date.now().toString(36).toUpperCase();

  const sessionResult = db.prepare(`
    INSERT INTO sessions (session_code, booth_id, frame_id, photo_count, status)
    VALUES (?, ?, ?, ?, 'completed')
  `).run(session_code, req.booth.id, frame_id || null, req.files.length);

  const sessionId = sessionResult.lastInsertRowid;

  const insertPhoto = db.prepare(
    'INSERT INTO photos (session_id, filename, filepath, filesize) VALUES (?, ?, ?, ?)'
  );

  req.files.forEach(file => {
    const rel = path.relative(UPLOAD_DIR, file.path);
    insertPhoto.run(sessionId, file.filename, rel, file.size);
  });

  db.prepare(`UPDATE booths SET current_sessions_today = current_sessions_today + 1 WHERE id = ?`)
    .run(req.booth.id);

  res.status(201).json({
    session_code,
    session_id: sessionId,
    photo_count: req.files.length,
    download_url: `/download/${session_code}`
  });
});

// GET /api/sessions  (admin)
router.get('/', authMiddleware, (req, res) => {
  const { booth_id, date_from, date_to, page = 1, limit = 20 } = req.query;
  let where = [];
  let params = [];

  if (booth_id) { where.push('s.booth_id = ?'); params.push(booth_id); }
  if (date_from) { where.push("DATE(s.created_at) >= ?"); params.push(date_from); }
  if (date_to) { where.push("DATE(s.created_at) <= ?"); params.push(date_to); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const sessions = db.prepare(`
    SELECT s.*, b.name AS booth_name, f.name AS frame_name,
      (SELECT COUNT(*) FROM photos p WHERE p.session_id = s.id) AS photo_count,
      (SELECT p.filename FROM photos p WHERE p.session_id = s.id AND p.filename LIKE 'FINAL_%' LIMIT 1) AS final_photo
    FROM sessions s
    LEFT JOIN booths b ON b.id = s.booth_id
    LEFT JOIN frames f ON f.id = s.frame_id
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM sessions s ${whereClause}
  `).get(...params);

  res.json({ sessions, total: total.count, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/sessions/:code  (public - for guest download)
router.get('/:code', (req, res) => {
  const session = db.prepare(`
    SELECT s.*, b.name AS booth_name, f.name AS frame_name
    FROM sessions s
    LEFT JOIN booths b ON b.id = s.booth_id
    LEFT JOIN frames f ON f.id = s.frame_id
    WHERE s.session_code = ?
  `).get(req.params.code);
  if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });

  const photos = db.prepare('SELECT * FROM photos WHERE session_id = ?').all(session.id);
  session.photos = photos.map(p => ({ ...p, url: `/api/photos/${p.filename}` }));

  db.prepare('UPDATE sessions SET guest_downloaded = guest_downloaded + 1 WHERE id = ?').run(session.id);
  res.json(session);
});

// DELETE /api/sessions/:id (admin)
router.delete('/:id', authMiddleware, (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });

  const photos = db.prepare('SELECT * FROM photos WHERE session_id = ?').all(session.id);
  photos.forEach(p => {
    const full = path.join(UPLOAD_DIR, p.filepath);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  });

  db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
  res.json({ message: 'Sesi berhasil dihapus' });
});

module.exports = router;
