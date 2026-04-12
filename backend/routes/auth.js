const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'memoribooth_secret_key_change_in_production';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin) return res.status(401).json({ error: 'Email atau password salah' });

  const valid = bcrypt.compareSync(password, admin.password);
  if (!valid) return res.status(401).json({ error: 'Email atau password salah' });

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authMiddleware, (req, res) => {
  const admin = db.prepare('SELECT id, name, email, role, created_at FROM admins WHERE id = ?').get(req.admin.id);
  res.json(admin);
});

// PUT /api/auth/password
router.put('/password', require('../middleware/auth').authMiddleware, (req, res) => {
  const { current_password, new_password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!bcrypt.compareSync(current_password, admin.password)) {
    return res.status(400).json({ error: 'Password lama salah' });
  }
  const hashed = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashed, req.admin.id);
  res.json({ message: 'Password berhasil diubah' });
});

module.exports = router;
