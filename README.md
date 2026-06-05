# Roblox Status Watcher

Sistem pemantau status online Roblox yang mengirimkan notifikasi ke Discord via Webhook secara otomatis — hanya saat status berubah (anti-spam). Deploy di **Vercel** (gratis), dijadwalkan oleh **GitHub Actions** (gratis, setiap 5 menit).

---

## Fitur

- **Monitoring Otomatis** — GitHub Actions memanggil endpoint Vercel setiap 5 menit
- **Anti-Spam** — Notifikasi hanya dikirim saat status benar-benar berubah
- **First-Run Silent** — Saat user baru ditambahkan, tidak langsung spam notif
- **Discord Embed Profesional** — Avatar, nama, link profil, transisi status
- **Avatar di Dashboard** — Foto profil Roblox tampil di list user
- **Multi-User** — Pantau beberapa akun sekaligus
- **Reset Status** — Paksa kirim notif ulang dengan satu klik
- **Gratis 100%** — Vercel Hobby + GitHub Actions + Upstash Free Tier

---

## Arsitektur

```
GitHub Actions (schedule */5 * * * *)
    └─→ GET https://app.vercel.app/api/check-roblox
              ├─→ Roblox Presence API   (ambil status terkini)
              ├─→ Upstash Redis         (bandingkan dengan status lama)
              └─→ Discord Webhook       (kirim notif jika status berubah)
```

> **Mengapa GitHub Actions, bukan Vercel Cron?**
> Vercel Hobby plan hanya mendukung cron **1x per hari**. GitHub Actions gratis dan bisa jadwal **setiap 5 menit** (minimum GitHub Actions).

---

## Panduan Setup Lengkap

### Prasyarat

- Akun [GitHub](https://github.com)
- Akun [Vercel](https://vercel.com) (gratis)
- Akun [Discord](https://discord.com)

---

### Langkah 1 — Upload ke GitHub

1. Buat repository baru di GitHub (boleh Private)
2. Upload semua file project
3. Pastikan `.github/workflows/roblox-monitor.yml` ikut ter-upload

> Jangan commit file `.env` — sudah ada di `.gitignore`

---

### Langkah 2 — Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New Project**
2. Import repository GitHub
3. Konfigurasi:
   - **Framework Preset**: `Other`
   - **Root Directory**: `.` *(default)*
   - **Build Command**: *(kosong)*
   - **Output Directory**: *(kosong)*
4. Klik **Deploy**

Catat **URL production** setelah deploy (contoh: `https://webhook-roblox.vercel.app`)

---

### Langkah 3 — Buat Discord Webhook

1. Buka channel Discord tujuan → ⚙️ **Edit Channel**
2. **Integrations → Webhooks → New Webhook**
3. Beri nama → **Copy Webhook URL**

Format: `https://discord.com/api/webhooks/ANGKA/TOKEN`

---

### Langkah 4 — Setup Upstash Redis (untuk persistence)

Upstash Redis menyimpan status user antar request — **sangat direkomendasikan untuk production**.

1. Buka [Vercel Dashboard](https://vercel.com) → Project → tab **Storage**
2. Klik **Connect Store → Marketplace → Upstash**
3. Buat database baru (Free tier: 10.000 request/hari, lebih dari cukup)
4. **Connect** ke project Vercel kamu
5. Vercel otomatis menambahkan env vars ke project:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

> **Tanpa Upstash:** Sistem tetap berjalan tapi state tidak tersimpan — setiap GitHub Actions run dianggap first-run (tidak akan kirim notif). **Wajib pakai Upstash di production.**

---

### Langkah 5 — Set Environment Variables di Vercel

Buka: **Vercel Dashboard → Project → Settings → Environment Variables**

| Variable | Nilai | Keterangan |
|---|---|---|
| `DISCORD_WEBHOOK_URL` | URL webhook Discord | **Wajib** |
| `ROBLOX_USERNAMES` | `UsernameA,UsernameB` | Opsional (bisa via dashboard) |
| `CRON_SECRET` | String acak 64 char | **Wajib** (keamanan) |
| `UPSTASH_REDIS_REST_URL` | *(auto dari Langkah 4)* | Auto |
| `UPSTASH_REDIS_REST_TOKEN` | *(auto dari Langkah 4)* | Auto |

**Cara generate `CRON_SECRET`:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Salin output 64 karakter tersebut.

Setelah set env vars → **Redeploy** di tab Deployments.

---

### Langkah 6 — Set GitHub Secrets

Buka: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Nilai |
|---|---|
| `APP_URL` | URL Vercel **tanpa trailing slash**, contoh: `https://webhook-roblox.vercel.app` |
| `CRON_SECRET` | **Nilai yang sama** dengan yang diset di Vercel |

---

### Langkah 7 — Aktifkan GitHub Actions

1. Buka tab **Actions** di repository GitHub
2. Jika ada pesan "Workflows aren't being run" → klik **I understand my workflows, go ahead and enable them**
3. Klik workflow **Roblox Status Monitor** → **Enable workflow**

Workflow akan otomatis berjalan setiap 5 menit.

**Test manual:**
Tab Actions → **Roblox Status Monitor** → **Run workflow** → **Run workflow**

Cek log untuk memastikan HTTP status 200.

---

### Langkah 8 — Tambah User yang Dipantau

**A. Via Dashboard (disarankan):**
1. Buka URL Vercel di browser
2. Tab **Settings** → isi username → **Add to Watch List**

**B. Via Environment Variable Vercel:**
Set `ROBLOX_USERNAMES=UsernameA,UsernameB` → Redeploy

---

## Reset Status

Tombol **Reset Status** di dashboard berguna untuk:
- Memaksa notifikasi dikirim ulang pada run berikutnya
- Testing setelah konfigurasi baru
- Setelah menambah user dan ingin langsung dapat notif

---

## Menjalankan Lokal

```bash
npm install
cp .env.example .env
# Edit .env: isi ROBLOX_USERNAMES dan DISCORD_WEBHOOK_URL
# CRON_SECRET dan Upstash tidak perlu untuk lokal
npm run dev
```

Buka **http://localhost:3000**

Lokal menggunakan file `.local-kv.json` sebagai pengganti Redis otomatis.

---

## Struktur Project

```
├── .github/
│   └── workflows/
│       └── roblox-monitor.yml     # Scheduler GitHub Actions (tiap 5 menit)
├── api/
│   ├── check-roblox.js            # Endpoint utama — cek & notif
│   ├── reset-status.js            # Reset cache status
│   ├── test-webhook.js            # Test notif Discord
│   ├── manage-users.js            # CRUD user monitored
│   ├── history.js                 # Riwayat perubahan
│   └── services/
│       ├── roblox.service.js      # Roblox API
│       ├── discord.service.js     # Discord embed webhook
│       └── state.service.js       # State (Upstash Redis / local fallback)
├── public/
│   ├── index.html                 # Dashboard SPA
│   ├── css/style.css
│   └── js/app.js
├── local-server.js                # Server development lokal
├── vercel.json                    # Konfigurasi Vercel
├── .env.example                   # Template environment variables
└── package.json
```

---

## API Endpoints

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/check-roblox` | Cek status & kirim notif (dipanggil GitHub Actions) |
| `POST` | `/api/reset-status` | Reset cache (body opsional: `{ "username": "..." }`) |
| `GET/POST` | `/api/test-webhook` | Kirim notif uji coba |
| `GET` | `/api/manage-users` | Ambil daftar user |
| `POST` | `/api/manage-users` | `{ "action": "add\|remove", "username": "..." }` |
| `GET` | `/api/history` | Riwayat perubahan status |
| `POST` | `/api/history` | `{ "action": "clear" }` |

---

## Status Roblox

| Status | Keterangan |
|---|---|
| `offline` | Tidak aktif |
| `online` | Membuka website Roblox |
| `in_game` | Sedang bermain game |
| `studio` | Membuka Roblox Studio |

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| GitHub Actions tidak jalan | Cek tab Actions, pastikan workflow di-enable. Cek secrets `APP_URL` dan `CRON_SECRET` sudah diset |
| Notifikasi tidak terkirim | Klik **Reset Status** di dashboard, tunggu 5 menit. Cek log GitHub Actions |
| HTTP 401 di GitHub Actions | `CRON_SECRET` di GitHub Secrets tidak sama dengan di Vercel env vars |
| Status selalu first-run | Upstash Redis belum di-setup — setiap request dianggap baru |
| Avatar tidak muncul | Normal saat userId belum tersedia — akan muncul setelah Refresh pertama |
