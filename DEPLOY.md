# 🚀 PANDUAN DEPLOY MEMORIBOOTH SERVER
## VPS Hostinger Ubuntu 22.04 LTS

---

## 1. LOGIN VPS

```bash
ssh root@72.62.121.44
```

---

## 2. INSTALL NODE.JS & TOOLS

```bash
# Update sistem
apt update && apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install tools
apt install -y git nginx certbot python3-certbot-nginx

# Install PM2 (process manager)
npm install -g pm2

# Cek versi
node -v   # harus v20+
npm -v
```

---

## 3. CLONE REPO DARI GITHUB

```bash
# Buat folder
mkdir -p /var/www
cd /var/www

# Clone repo kamu
git clone https://github.com/USERNAME/memoribooth-server.git
cd memoribooth-server
```

---

## 4. INSTALL DEPENDENCIES & BUILD

```bash
# Install backend
cd backend && npm install --production
cd ..

# Install & build frontend
cd frontend && npm install && npm run build
cd ..
```

---

## 5. KONFIGURASI ENV (WAJIB!)

```bash
# Edit JWT secret di ecosystem.config.js
nano ecosystem.config.js
```

Ganti bagian ini:
```js
JWT_SECRET: 'GANTI_INI_DENGAN_STRING_RANDOM_PANJANG',
FRONTEND_URL: 'https://yourdomain.com'  // domain kamu
```

Generate secret random:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 6. SETUP NGINX

```bash
# Copy config nginx
cp nginx.conf /etc/nginx/sites-available/memoribooth

# Ganti 'yourdomain.com' dengan domain asli kamu
nano /etc/nginx/sites-available/memoribooth

# Aktifkan site
ln -s /etc/nginx/sites-available/memoribooth /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test & reload nginx
nginx -t && systemctl reload nginx
```

---

## 7. SSL CERTIFICATE (HTTPS GRATIS)

```bash
# Pastikan domain sudah pointing ke IP VPS (72.62.121.44)
# di Hostinger DNS manager

# Install SSL
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto renew
systemctl enable certbot.timer
```

---

## 8. JALANKAN SERVER

```bash
cd /var/www/memoribooth-server

# Start dengan PM2
pm2 start ecosystem.config.js

# Auto start saat reboot
pm2 startup
pm2 save

# Cek status
pm2 status
pm2 logs memoribooth
```

---

## 9. AKSES DASHBOARD

Buka browser: **https://yourdomain.com**

Login default:
- Email: `admin@memoribooth.com`
- Password: `memoribooth123`

⚠️ **Segera ganti password setelah login pertama!**

---

## 10. HUBUNGKAN BOOTH PC

Di aplikasi booth kamu, set:
- **Server URL**: `https://yourdomain.com`
- **API Key**: Ambil dari menu **Kelola Booth → API Key**

Endpoint upload foto:
```
POST https://yourdomain.com/api/sessions/upload
Header: x-api-key: MB-XXXXXXXXXXXX
Body (multipart): photos[] = file, frame_id = 1
```

---

## UPDATE APLIKASI

```bash
cd /var/www/memoribooth-server
git pull origin main
cd frontend && npm run build && cd ..
pm2 restart memoribooth
```

---

## BACKUP DATABASE

```bash
# Database tersimpan di:
/var/www/memoribooth-server/backend/memoribooth.db

# Backup manual
cp backend/memoribooth.db backend/memoribooth-backup-$(date +%Y%m%d).db

# Auto backup harian (tambah ke crontab)
crontab -e
# Tambah baris ini:
0 2 * * * cp /var/www/memoribooth-server/backend/memoribooth.db /var/backups/memoribooth-$(date +\%Y\%m\%d).db
```

---

## TROUBLESHOOTING

```bash
# Cek log server
pm2 logs memoribooth

# Cek nginx error
tail -f /var/log/nginx/error.log

# Restart server
pm2 restart memoribooth

# Cek port
ss -tlnp | grep 3001
```

---

## STRUKTUR FOLDER

```
memoribooth-server/
├── backend/
│   ├── server.js          ← Entry point
│   ├── memoribooth.db     ← Database SQLite
│   ├── uploads/           ← Semua foto tersimpan di sini
│   │   ├── 2026-04-12/    ← Diorganisir per tanggal
│   │   └── frames/        ← File frame/template
│   ├── db/database.js     ← Init & schema DB
│   ├── middleware/auth.js ← JWT & API key auth
│   └── routes/
│       ├── auth.js        ← Login, ganti password
│       ├── booths.js      ← CRUD booth
│       ├── sessions.js    ← Upload & list sesi
│       ├── frames.js      ← CRUD frame
│       └── analytics.js   ← Laporan & statistik
├── frontend/
│   ├── src/
│   │   ├── pages/         ← Dashboard, Booths, Gallery, dll
│   │   ├── components/    ← Layout, Sidebar
│   │   └── lib/api.js     ← API client
│   └── dist/              ← Build hasil (serve via nginx)
├── ecosystem.config.js    ← PM2 config
├── nginx.conf             ← Nginx config
└── DEPLOY.md              ← Panduan ini
```
