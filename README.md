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
- **Gratis 100%** — Vercel Hobby + GitHub Actions (tidak perlu upgrade)

---

## Arsitektur

```
GitHub Actions (schedule */5 * * * *)
    └─→ GET https://app.vercel.app/api/check-roblox
              ├─→ Roblox Presence API   (ambil status terkini)
              ├─→ Vercel KV / LocalFile (bandingkan dengan status lama)
              └─→ Discord Webhook       (kirim notif jika status berubah)
```

---

## Panduan Setup Lengkap

### Prasyarat

- Akun [GitHub](https://github.com) (untuk Actions)
- Akun [Vercel](https://vercel.com) (untuk deploy, gratis)
- Akun [Discord](https://discord.com) (untuk notifikasi)

---

### Langkah 1 — Fork / Upload ke GitHub

1. Buat repository baru di GitHub (boleh Private)
2. Upload semua file project ke repo tersebut
3. Pastikan file `.github/workflows/roblox-monitor.yml` ikut ter-upload

> **Penting:** Jangan commit file `.env` — sudah ada di `.gitignore`

---

### Langkah 2 — Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New Project**
2. Import repository GitHub yang baru dibuat
3. Pada halaman konfigurasi:
   - **Framework Preset**: `Other`
   - **Root Directory**: `.` *(biarkan default)*
   - **Build Command**: *(kosongkan)*
   - **Output Directory**: *(kosongkan)*
4. Klik **Deploy**

Setelah deploy selesai, catat **URL production** kamu (contoh: `https://webhook-roblox.vercel.app`)

---

### Langkah 3 — Buat Discord Webhook

1. Buka channel Discord tujuan
2. Klik ⚙️ **Edit Channel → Integrations → Webhooks**
3. Klik **New Webhook** → beri nama → **Copy Webhook URL**

Format URL: `https://discord.com/api/webhooks/ANGKA/TOKEN`

---

### Langkah 4 — Set Environment Variables di Vercel

Buka: **Vercel Dashboard → Project → Settings → Environment Variables**

Tambahkan variabel berikut:

| Variable | Nilai | Environment |
|---|---|---|
| `DISCORD_WEBHOOK_URL` | URL webhook Discord kamu | Production |
| `ROBLOX_USERNAMES` | Username Roblox, pisah koma: `A,B,C` | Production |
| `CRON_SECRET` | String acak panjang (lihat cara buat di bawah) | Production |

**Cara buat `CRON_SECRET`:**
Jalankan di terminal lokal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Salin output 64 karakter tersebut sebagai nilai `CRON_SECRET`.

**Opsional — Vercel KV (untuk state persistence yang lebih stabil):**
1. Vercel Dashboard → tab **Storage**
2. **Create Database → KV → Create**
3. Buka database → **Projects → Connect Project** → pilih project kamu
4. Vercel otomatis menambahkan `KV_REST_API_URL` dan `KV_REST_API_TOKEN`

> Tanpa KV: sistem tetap berjalan menggunakan memori ephemeral, tapi status tidak tersimpan antar request — setiap cron dianggap first-run. **Sangat disarankan pakai KV.**

Setelah tambah env vars → klik **Redeploy** di tab Deployments.

---

### Langkah 5 — Set GitHub Secrets

Buka: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

Tambahkan 2 secret:

| Secret Name | Nilai |
|---|---|
| `APP_URL` | URL Vercel kamu, **tanpa trailing slash** — contoh: `https://webhook-roblox.vercel.app` |
| `CRON_SECRET` | Nilai yang sama dengan yang kamu set di Vercel |

---

### Langkah 6 — Aktifkan GitHub Actions

1. Buka tab **Actions** di repository GitHub kamu
2. Jika muncul pesan "Workflows aren't being run", klik **I understand my workflows, go ahead and enable them**
3. Klik workflow **Roblox Status Monitor** → **Enable workflow**

Workflow akan otomatis berjalan setiap 5 menit.

**Test manual:**
Buka tab Actions → **Roblox Status Monitor** → **Run workflow** → **Run workflow**

---

### Langkah 7 — Tambah User yang Dipantau

Ada 2 cara:

**A. Via Dashboard (disarankan):**
1. Buka URL Vercel kamu di browser
2. Tab **Settings** → isi username Roblox → **Add to Watch List**

**B. Via Vercel Environment Variable:**
Set `ROBLOX_USERNAMES=UsernameA,UsernameB` di Vercel

---

## Cara Kerja Reset Status

Tombol **Reset Status** di dashboard berguna untuk:
- Memaksa notifikasi terkirim ulang pada pengecekan berikutnya
- Testing setelah konfigurasi baru
- Setelah menambahkan user baru dan ingin langsung dapat notif

---

## Environment Variables Lengkap

### Untuk Vercel (production)

| Variable | Status | Keterangan |
|---|---|---|
| `DISCORD_WEBHOOK_URL` | **Wajib** | URL webhook Discord |
| `ROBLOX_USERNAMES` | Opsional | Fallback jika tidak pakai dashboard |
| `CRON_SECRET` | **Wajib** | Mengamankan endpoint dari akses luar |
| `KV_REST_API_URL` | Opsional (auto) | Otomatis dari Vercel KV |
| `KV_REST_API_TOKEN` | Opsional (auto) | Otomatis dari Vercel KV |

### Untuk GitHub Actions (secrets)

| Secret | Status | Keterangan |
|---|---|---|
| `APP_URL` | **Wajib** | URL Vercel production |
| `CRON_SECRET` | **Wajib** | Sama dengan yang di Vercel |

### Untuk local development (.env)

Salin `.env.example` → `.env`, isi:
```
ROBLOX_USERNAMES=UsernameA,UsernameB
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```
KV tidak diperlukan lokal — sistem pakai `.local-kv.json` otomatis.

---

## Menjalankan Lokal

```bash
npm install
cp .env.example .env
# → Edit .env: isi ROBLOX_USERNAMES dan DISCORD_WEBHOOK_URL
npm run dev
```

Buka **http://localhost:3000**

---

## Struktur Project

```
├── .github/
│   └── workflows/
│       └── roblox-monitor.yml     # GitHub Actions scheduler (tiap 5 menit)
├── api/
│   ├── check-roblox.js            # Endpoint utama — cek & notif
│   ├── reset-status.js            # Reset cache status
│   ├── test-webhook.js            # Test notif Discord
│   ├── manage-users.js            # CRUD user monitored
│   ├── history.js                 # Riwayat perubahan
│   └── services/
│       ├── roblox.service.js      # Roblox API (presence, users, games)
│       ├── discord.service.js     # Discord embed webhook
│       └── state.service.js       # State (Vercel KV / local fallback)
├── public/
│   ├── index.html                 # Dashboard SPA
│   ├── css/style.css              # Styling
│   └── js/app.js                  # Frontend logic
├── local-server.js                # Server untuk development lokal
├── vercel.json                    # Konfigurasi Vercel
├── .env.example                   # Template env vars
└── README.md
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

**GitHub Actions tidak jalan:**
- Cek tab Actions → pastikan workflow tidak di-disable
- Cek apakah secrets `APP_URL` dan `CRON_SECRET` sudah diset

**Notifikasi tidak terkirim:**
- Klik **Reset Status** di dashboard, lalu tunggu 5 menit
- Cek log GitHub Actions — klik run terbaru untuk lihat detail error
- Pastikan `DISCORD_WEBHOOK_URL` di Vercel sudah benar

**Error 401 di GitHub Actions:**
- Nilai `CRON_SECRET` di GitHub Secrets tidak sama dengan di Vercel env vars

**Status selalu berubah tiap run (tidak stabil):**
- Setup Vercel KV untuk persistence yang benar (lihat Langkah 4)
