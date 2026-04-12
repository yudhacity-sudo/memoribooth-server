const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'memoribooth.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS booths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      api_key TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'offline',
      max_sessions_per_day INTEGER DEFAULT 0,
      current_sessions_today INTEGER DEFAULT 0,
      last_seen DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS frames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      filename TEXT NOT NULL,
      thumbnail TEXT,
      slots INTEGER DEFAULT 4,
      is_active INTEGER DEFAULT 1,
      booth_ids TEXT DEFAULT 'all',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_code TEXT UNIQUE NOT NULL,
      booth_id INTEGER NOT NULL,
      frame_id INTEGER,
      photo_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed',
      guest_downloaded INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booth_id) REFERENCES booths(id),
      FOREIGN KEY (frame_id) REFERENCES frames(id)
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      filesize INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const adminExists = db.prepare('SELECT id FROM admins WHERE email = ?').get('admin@memoribooth.com');
  if (!adminExists) {
    const hashed = bcrypt.hashSync('memoribooth123', 10);
    db.prepare(`INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)`)
      .run('Admin', 'admin@memoribooth.com', hashed, 'superadmin');
    console.log('Default admin created: admin@memoribooth.com / memoribooth123');
  }

  const settingExists = db.prepare('SELECT key FROM settings WHERE key = ?').get('app_name');
  if (!settingExists) {
    const defaults = [
      ['app_name', 'MEMORIBOOTH'],
      ['app_tagline', 'Self-Hosted Photobooth Server'],
      ['max_file_size_mb', '10'],
      ['allowed_formats', 'jpg,jpeg,png'],
      ['auto_delete_days', '0'],
    ];
    const ins = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    defaults.forEach(([k, v]) => ins.run(k, v));
  }

  console.log('Database initialized');
}

initDB();
module.exports = db;
