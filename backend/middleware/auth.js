const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'memoribooth_secret_key_change_in_production';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' });
  }
}

function boothApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key diperlukan' });
  const db = require('../db/database');
  const booth = db.prepare('SELECT * FROM booths WHERE api_key = ?').get(apiKey);
  if (!booth) return res.status(401).json({ error: 'API key tidak valid' });
  db.prepare('UPDATE booths SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?')
    .run('online', booth.id);
  req.booth = booth;
  next();
}

module.exports = { authMiddleware, boothApiKey };
