const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db/database');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const SELF_TOKEN = process.env.SELF_SERVER_TOKEN || 'booth2025';

function boothToken(req, res, next) {
  const token = req.headers['x-booth-token'];
  if (!token || token !== SELF_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Token tidak valid' });
  }
  next();
}

function writeBase64(dataUrl, outPath) {
  const base64 = dataUrl.split(',')[1];
  if (!base64) throw new Error('Invalid dataUrl');
  fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
}

function getOrCreateBooth(boothName) {
  let booth = db.prepare('SELECT * FROM booths WHERE name = ?').get(boothName);
  if (!booth) {
    const apiKey = 'MB-' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 20);
    const result = db.prepare('INSERT INTO booths (name, location, api_key, status) VALUES (?, ?, ?, ?)').run(boothName, '', apiKey, 'online');
    booth = db.prepare('SELECT * FROM booths WHERE id = ?').get(result.lastInsertRowid);
    console.log(`[BOOTH] Booth baru: ${boothName}`);
  }
  db.prepare('UPDATE booths SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run('online', booth.id);
  return booth;
}

// POST /api/booth/upload-json
router.post('/upload-json', boothToken, async (req, res) => {
  try {
    const { sid, finalDataUrl, raws, motionDataUrl, metadata } = req.body || {};
    if (!finalDataUrl || !Array.isArray(raws) || raws.length === 0) {
      return res.status(400).json({ ok: false, error: 'Payload tidak lengkap (finalDataUrl / raws wajib)' });
    }

    const sessionCode = sid ? String(sid) : ('MB' + Date.now().toString(36).toUpperCase());
    const date = new Date().toISOString().slice(0, 10);
    const sessionDir = path.join(UPLOAD_DIR, date, sessionCode);
    fs.mkdirSync(sessionDir, { recursive: true });

    // Simpan FINAL
    const finalName = 'FINAL_with_frame.jpg';
    const finalPath = path.join(sessionDir, finalName);
    writeBase64(finalDataUrl, finalPath);

    // Simpan RAW files
    const rawNames = [];
    raws.forEach((dataUrl, i) => {
      const name = `RAW_${String(i + 1).padStart(2, '0')}.jpg`;
      writeBase64(dataUrl, path.join(sessionDir, name));
      rawNames.push(name);
    });

    // Simpan MOTION jika ada
    let motionName = '';
    if (motionDataUrl && typeof motionDataUrl === 'string' && motionDataUrl.startsWith('data:video')) {
      const mime = motionDataUrl.slice(5, motionDataUrl.indexOf(';'));
      motionName = mime.includes('mp4') ? 'MOTION.mp4' : 'MOTION.webm';
      writeBase64(motionDataUrl, path.join(sessionDir, motionName));
    }

    // Booth
    const boothName = metadata?.boothName || 'Booth 1';
    const booth = getOrCreateBooth(boothName);

    // Session ke DB
    const sessionResult = db.prepare(`
      INSERT INTO sessions (session_code, booth_id, photo_count, status)
      VALUES (?, ?, ?, 'completed')
    `).run(sessionCode, booth.id, raws.length + 1);
    const sessionId = sessionResult.lastInsertRowid;

    // Foto ke DB
    const insertPhoto = db.prepare('INSERT INTO photos (session_id, filename, filepath, filesize) VALUES (?, ?, ?, ?)');
    const allFiles = [finalName, ...rawNames, ...(motionName ? [motionName] : [])];
    allFiles.forEach(name => {
      const fp = path.join(sessionDir, name);
      const size = fs.existsSync(fp) ? fs.statSync(fp).size : 0;
      const rel = path.relative(UPLOAD_DIR, fp);
      insertPhoto.run(sessionId, name, rel, size);
    });

    db.prepare('UPDATE booths SET current_sessions_today = current_sessions_today + 1 WHERE id = ?').run(booth.id);

    // Download URL & QR
    const baseUrl = `http://${req.headers.host}`;
    const downloadUrl = `${baseUrl}/api/booth/download/${sessionCode}`;
    const qrDataUrl = await QRCode.toDataURL(downloadUrl, { margin: 1, width: 340 });

    res.json({ ok: true, sessionCode, sessionId, downloadUrl, qrDataUrl, photoCount: raws.length + 1 });

  } catch (e) {
    console.error('[BOOTH] upload-json error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/booth/:boothId/heartbeat
router.post('/:boothId/heartbeat', boothToken, (req, res) => {
  try {
    const { boothName } = req.body || {};
    getOrCreateBooth(boothName || req.params.boothId || 'Booth 1');
    res.json({ ok: true, commands: [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/booth/download/:sessionCode — halaman download tamu
router.get('/download/:sessionCode', async (req, res) => {
  try {
    const session = db.prepare(`
      SELECT s.*, b.name as booth_name
      FROM sessions s
      LEFT JOIN booths b ON b.id = s.booth_id
      WHERE s.session_code = ?
    `).get(req.params.sessionCode);

    if (!session) return res.status(404).send('<h2 style="font-family:sans-serif;padding:2rem">Sesi tidak ditemukan</h2>');

    const photos = db.prepare('SELECT * FROM photos WHERE session_id = ? ORDER BY filename ASC').all(session.id);
    db.prepare('UPDATE sessions SET guest_downloaded = guest_downloaded + 1 WHERE id = ?').run(session.id);

    const baseUrl = `http://${req.headers.host}`;
    const finalPhoto = photos.find(p => p.filename.startsWith('FINAL_'));
    const rawPhotos  = photos.filter(p => p.filename.startsWith('RAW_'));
    const motionFile = photos.find(p => p.filename.startsWith('MOTION'));

    const finalUrl  = finalPhoto  ? `${baseUrl}/api/photos/${finalPhoto.filename}`  : '';
    const motionUrl = motionFile  ? `${baseUrl}/api/photos/${motionFile.filename}`  : '';

    const rawButtons = rawPhotos.map((p, i) => `
      <a class="btn" href="${baseUrl}/api/photos/${p.filename}" download="RAW_${i+1}.jpg">
        📷 Download RAW ${i+1}
      </a>`).join('');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>MEMORIBOOTH — Download Foto</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:system-ui,-apple-system,sans-serif;
      background:linear-gradient(135deg,#0D0D1A 0%,#1A1A35 50%,#0D1A2A 100%);
      color:white;min-height:100vh;padding:20px;
      display:flex;align-items:flex-start;justify-content:center;
    }
    .wrap{max-width:520px;width:100%;margin:0 auto;padding-bottom:40px}
    .header{text-align:center;padding:32px 20px 24px}
    .logo{font-size:48px;margin-bottom:8px}
    h1{font-size:24px;font-weight:800;letter-spacing:.5px;
      background:linear-gradient(135deg,#F472B6,#A78BFA,#67E8F9);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .sub{font-size:13px;color:rgba(255,255,255,.55);margin-top:6px}
    .card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
      border-radius:20px;padding:20px;margin-bottom:16px}
    .card-title{font-size:11px;font-weight:800;letter-spacing:1px;
      text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:14px}
    .preview{width:100%;border-radius:14px;border:1px solid rgba(255,255,255,.1);
      display:block;margin-bottom:14px}
    .btn{
      display:flex;align-items:center;justify-content:center;gap:8px;
      padding:14px 20px;border-radius:14px;text-decoration:none;
      font-weight:700;font-size:14px;margin-bottom:10px;
      border:1px solid rgba(255,255,255,.15);
      background:rgba(255,255,255,.07);color:white;
      transition:background .15s;cursor:pointer;
    }
    .btn:hover{background:rgba(255,255,255,.14)}
    .btn.primary{
      background:linear-gradient(135deg,rgba(124,58,237,.8),rgba(167,139,250,.6));
      border-color:rgba(167,139,250,.5);font-size:16px;padding:18px;
    }
    .btn.green{
      background:linear-gradient(135deg,rgba(16,185,129,.3),rgba(52,211,153,.2));
      border-color:rgba(52,211,153,.4);
    }
    .btn.purple{
      background:linear-gradient(135deg,rgba(124,58,237,.3),rgba(167,139,250,.2));
      border-color:rgba(167,139,250,.4);
    }
    video{width:100%;border-radius:14px;border:1px solid rgba(255,255,255,.1);
      display:block;margin-bottom:14px;background:#000}
    .raws{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .meta{text-align:center;font-size:12px;color:rgba(255,255,255,.35);
      margin-top:20px;line-height:1.6}
    .badge{display:inline-block;background:rgba(167,139,250,.2);
      border:1px solid rgba(167,139,250,.3);border-radius:999px;
      font-size:11px;font-weight:700;padding:3px 12px;color:rgba(167,139,250,.9);
      margin-bottom:16px}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo">📷</div>
    <h1>MEMORIBOOTH</h1>
    <div class="sub">${session.booth_name || 'Photobooth'} · ${new Date(session.created_at).toLocaleString('id-ID')}</div>
  </div>

  ${finalUrl ? `
  <div class="card">
    <div class="card-title">📸 Foto Final (dengan Frame)</div>
    <img src="${finalUrl}" class="preview" alt="Foto Final"/>
    <a class="btn primary" href="${finalUrl}" download="MEMORIBOOTH_FINAL.jpg">
      ⬇ Download Foto Final
    </a>
  </div>` : ''}

  ${motionUrl ? `
  <div class="card">
    <div class="card-title">🎬 Motion Video</div>
    <video src="${motionUrl}" autoplay loop muted playsinline controls></video>
    <a class="btn green" href="${motionUrl}" download="MEMORIBOOTH_MOTION.webm">
      ⬇ Download Motion Video
    </a>
  </div>` : ''}

  ${rawPhotos.length > 0 ? `
  <div class="card">
    <div class="card-title">🖼 Foto RAW (tanpa frame) — ${rawPhotos.length} foto</div>
    <div class="raws">
      ${rawPhotos.map((p, i) => `
        <div>
          <img src="${baseUrl}/api/photos/${p.filename}" class="preview" alt="RAW ${i+1}" style="margin-bottom:8px"/>
          <a class="btn purple" href="${baseUrl}/api/photos/${p.filename}" download="RAW_${i+1}.jpg" style="font-size:12px;padding:10px">
            ⬇ RAW ${i+1}
          </a>
        </div>`).join('')}
    </div>
  </div>` : ''}

  <div class="meta">
    Kode sesi: <b>${req.params.sessionCode}</b><br>
    ${photos.length} file tersedia · Diunduh ${session.guest_downloaded} kali<br>
    MEMORIBOOTH Server v1.0
  </div>
</div>
</body>
</html>`);

  } catch (e) {
    console.error('[BOOTH] download error:', e.message);
    res.status(500).send('Error: ' + e.message);
  }
});

module.exports = router;
