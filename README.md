# Roblox Webhook Presence Monitor

Sistem pemantau status online/offline user Roblox yang mengirimkan notifikasi instan ke Discord via Webhook hanya saat status berubah (anti-spam). Dapat berjalan secara lokal maupun dideploy langsung ke Vercel Serverless & Vercel Cron.

## 🚀 Fitur Utama

- **Real-time Monitoring**: Mengecek status user Roblox secara berkala.
- **Anti-Spam State Control**: Menyimpan status terakhir menggunakan Vercel KV (Redis) atau fallback local file (`.local-kv.json`), sehingga notifikasi hanya dikirim saat status berubah (`online`, `offline`, `in_game`, `studio`).
- **Rich Embed Discord**: Notifikasi Discord dengan warna status dinamis (Hijau = Online, Biru = In Game, Jingga = Studio, Abu-abu = Offline).
- **Multi-User Support**: Bisa memantau beberapa username sekaligus lewat config satu baris (comma-separated).
- **Vercel Cron Ready**: Konfigurasi otomatis cron job bawaan Vercel (`vercel.json`).

---

## 🛠️ Instalasi & Persiapan Lokal

### 1. Prasyarat
Pastikan Anda memiliki:
- Node.js versi 18 ke atas.
- Akun Discord (untuk mendapatkan Webhook URL).

### 2. Install Dependensi
Jalankan perintah berikut pada direktori project:
```bash
npm install
```

### 3. Konfigurasi Environment Variables (`.env`)
Salin file `.env.example` menjadi `.env` (file `.env` default sudah otomatis dibuatkan):
```bash
cp .env.example .env
```
Isi variabel berikut:
- **`ROBLOX_USERNAMES`**: Username Roblox yang ingin dipantau (pisahkan dengan koma jika lebih dari satu, contoh: `Roblox,Builderman`).
- **`DISCORD_WEBHOOK_URL`**: Salin Webhook URL dari Channel Discord Anda.

*(Catatan: Untuk local development, `KV_REST_API_URL` dan `KV_REST_API_TOKEN` bisa dikosongkan. Sistem akan otomatis menggunakan file local `.local-kv.json` sebagai fallback database).*

---

## 💻 Cara Menjalankan Secara Lokal

Untuk mempermudah testing tanpa perlu login ke Vercel CLI, kita menggunakan server lokal khusus (`local-server.js`):

1. Jalankan perintah berikut:
   ```bash
   npm run dev
   ```
2. Buka link dashboard monitor di browser pada alamat:
   [http://localhost:3000](http://localhost:3000)
3. Halaman dashboard interaktif akan mengambil data status Roblox user dengan lancar secara lokal menggunakan simulasi serverless function.

---

## 🚀 Cara Mendeploy ke Vercel

### Langkah Cepat dengan Vercel CLI:
```bash
# Login vercel jika belum
npx vercel login

# Hubungkan dan deploy project
npx vercel
```

### Konfigurasi Database Vercel KV (Redis):
1. Buka dashboard Vercel Anda, lalu pilih project yang telah dideploy.
2. Buka tab **Storage** dan buat instance **KV** (Redis).
3. Hubungkan KV database tersebut ke project Anda. Env variables `KV_REST_API_URL` dan `KV_REST_API_TOKEN` akan otomatis ditambahkan ke project Anda oleh Vercel.
4. Tambahkan environment variables `ROBLOX_USERNAMES` dan `DISCORD_WEBHOOK_URL` pada pengaturan project di dashboard Vercel.
5. Lakukan deploy ulang ke production:
   ```bash
   npm run deploy
   ```

Setelah dideploy, Vercel Cron (`vercel.json`) akan otomatis mengeksekusi `/api/check-roblox` setiap 5 menit sekali.

---

## 📁 Struktur Project

```text
├── api/
│   ├── check-roblox.js        # Serverless Orchestrator
│   └── services/
│       ├── roblox.service.js  # Integrasi API Roblox
│       ├── discord.service.js # Integrasi Webhook Discord
│       └── state.service.js   # State Management (Redis/Local Fallback)
├── public/
│   └── index.html             # Dashboard Monitor (Read-Only)
├── vercel.json                # Vercel Cron Configuration
├── package.json
└── README.md
```
