const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authMiddleware, boothApiKey } = require('../middleware/auth');

const FRAMES_DIR = path.join(__dirname, '..', 'uploads', 'frames');
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FRAMES_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'frame-' + uuidv4() + ext);
  }
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET /api/frames  (admin + booth)
router.get('/', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  let frames;
  if (apiKey) {
    const booth = db.prepare('SELECT * FROM booths WHERE api_key = ?').get(apiKey);
    if (!booth) return res.status(401).json({ error: 'API key tidak valid' });
    frames = db.prepare(`
      SELECT * FROM frames WHERE is_active = 1 
      AND (booth_ids = 'all' OR booth_ids LIKE ?)
      ORDER BY created_at DESC
    `).all(`%${booth.id}%`);
  } else {
    frames = db.prepare('SELECT * FROM frames ORDER BY created_at DESC').all();
  }
  res.json(frames);
});

// POST /api/frames  (admin)
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  const { name, type, slots, booth_ids } = req.body;
  if (!name || !req.file) return res.status(400).json({ error: 'Nama dan file frame wajib diisi' });
  const result = db.prepare(`
    INSERT INTO frames (name, type, filename, slots, booth_ids)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, type || 'custom', req.file.filename, slots || 4, booth_ids || 'all');
  res.status(201).json(db.prepare('SELECT * FROM frames WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/frames/:id  (admin)
router.put('/:id', authMiddleware, (req, res) => {
  const { name, type, slots, is_active, booth_ids } = req.body;
  const frame = db.prepare('SELECT * FROM frames WHERE id = ?').get(req.params.id);
  if (!frame) return res.status(404).json({ error: 'Frame tidak ditemukan' });
  db.prepare(`
    UPDATE frames SET name = ?, type = ?, slots = ?, is_active = ?, booth_ids = ? WHERE id = ?
  `).run(
    name || frame.name, type || frame.type,
    slots || frame.slots, is_active !== undefined ? is_active : frame.is_active,
    booth_ids || frame.booth_ids, req.params.id
  );
  res.json(db.prepare('SELECT * FROM frames WHERE id = ?').get(req.params.id));
});

// DELETE /api/frames/:id  (admin)
router.delete('/:id', authMiddleware, (req, res) => {
  const frame = db.prepare('SELECT * FROM frames WHERE id = ?').get(req.params.id);
  if (!frame) return res.status(404).json({ error: 'Frame tidak ditemukan' });
  const filePath = path.join(FRAMES_DIR, frame.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM frames WHERE id = ?').run(req.params.id);
  res.json({ message: 'Frame berhasil dihapus' });
});

module.exports = router;
