const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('./db/database'); // init DB on start

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos
app.use('/api/photos', (req, res, next) => {
  const filename = path.basename(req.path);
  // Search in uploads recursively
  const find = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { const r = find(full); if (r) return r; }
      else if (e.name === filename) return full;
    }
    return null;
  };
  const found = find(UPLOAD_DIR);
  if (!found) return res.status(404).json({ error: 'Foto tidak ditemukan' });
  res.sendFile(found);
});

// Serve frame images
app.use('/api/frame-images', express.static(path.join(UPLOAD_DIR, 'frames')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/booths', require('./routes/booths'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/frames', require('./routes/frames'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'MEMORIBOOTH Server', time: new Date().toISOString() });
});

// Serve frontend build in production
const frontendBuild = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🎉 MEMORIBOOTH Server berjalan di http://localhost:${PORT}`);
  console.log(`📂 Upload folder: ${UPLOAD_DIR}`);
  console.log(`🔑 Default login: admin@memoribooth.com / memoribooth123\n`);
});
