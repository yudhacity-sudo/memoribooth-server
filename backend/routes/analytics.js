const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/analytics/summary
router.get('/summary', (req, res) => {
  const today = db.prepare(`
    SELECT COUNT(*) as sessions, COALESCE(SUM(photo_count),0) as photos
    FROM sessions WHERE DATE(created_at) = DATE('now')
  `).get();

  const month = db.prepare(`
    SELECT COUNT(*) as sessions, COALESCE(SUM(photo_count),0) as photos
    FROM sessions WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
  `).get();

  const total = db.prepare(`
    SELECT COUNT(*) as sessions, COALESCE(SUM(photo_count),0) as photos FROM sessions
  `).get();

  const storage = db.prepare(`
    SELECT COALESCE(SUM(filesize),0) as bytes FROM photos
  `).get();

  const activeBooth = db.prepare(`
    SELECT COUNT(*) as count FROM booths WHERE status = 'online'
  `).get();

  const topFrame = db.prepare(`
    SELECT f.name, COUNT(*) as count FROM sessions s
    JOIN frames f ON f.id = s.frame_id
    WHERE strftime('%Y-%m', s.created_at) = strftime('%Y-%m', 'now')
    GROUP BY s.frame_id ORDER BY count DESC LIMIT 1
  `).get();

  res.json({
    today,
    month,
    total,
    storage_bytes: storage.bytes,
    active_booths: activeBooth.count,
    top_frame: topFrame || null
  });
});

// GET /api/analytics/daily?year=2026&month=04
router.get('/daily', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const month = req.query.month || String(new Date().getMonth() + 1).padStart(2, '0');
  const ym = `${year}-${month}`;

  const rows = db.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as sessions,
      COALESCE(SUM(photo_count),0) as photos,
      COUNT(DISTINCT booth_id) as active_booths
    FROM sessions
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(ym);

  res.json(rows);
});

// GET /api/analytics/monthly?year=2026
router.get('/monthly', (req, res) => {
  const year = req.query.year || new Date().getFullYear();

  const rows = db.prepare(`
    SELECT 
      strftime('%m', created_at) as month,
      COUNT(*) as sessions,
      COALESCE(SUM(photo_count),0) as photos
    FROM sessions
    WHERE strftime('%Y', created_at) = ?
    GROUP BY strftime('%m', created_at)
    ORDER BY month ASC
  `).all(String(year));

  res.json(rows);
});

// GET /api/analytics/yearly
router.get('/yearly', (req, res) => {
  const rows = db.prepare(`
    SELECT 
      strftime('%Y', created_at) as year,
      COUNT(*) as sessions,
      COALESCE(SUM(photo_count),0) as photos
    FROM sessions
    GROUP BY strftime('%Y', created_at)
    ORDER BY year ASC
  `).all();
  res.json(rows);
});

// GET /api/analytics/booths
router.get('/booths', (req, res) => {
  const rows = db.prepare(`
    SELECT 
      b.id, b.name, b.location, b.status,
      COUNT(s.id) as total_sessions,
      COALESCE(SUM(s.photo_count),0) as total_photos,
      COUNT(CASE WHEN DATE(s.created_at) = DATE('now') THEN 1 END) as today_sessions
    FROM booths b
    LEFT JOIN sessions s ON s.booth_id = b.id
    GROUP BY b.id
    ORDER BY total_sessions DESC
  `).all();
  res.json(rows);
});

// GET /api/analytics/peak-hours
router.get('/peak-hours', (req, res) => {
  const rows = db.prepare(`
    SELECT 
      strftime('%H', created_at) as hour,
      COUNT(*) as sessions
    FROM sessions
    WHERE DATE(created_at) >= DATE('now', '-30 days')
    GROUP BY hour
    ORDER BY hour ASC
  `).all();
  res.json(rows);
});

module.exports = router;
