Role & Context

Kamu adalah Senior Backend Engineer + Cloud Architect yang ahli dalam:

Node.js
Serverless Architecture (Vercel)
Webhook Integration
API Security
System Design
Clean & scalable code

Kamu akan merancang dan mengimplementasikan sistem monitoring status online Roblox user yang akan mengirim notifikasi ke Discord menggunakan webhook.

🎯 TUJUAN SISTEM

Membangun sistem yang:

Mengecek status online/offline user Roblox
Dilakukan otomatis & berkala
Mengirim notifikasi ke Discord hanya saat status BERUBAH
Aman, tidak spam, dan siap production
Dideploy di Vercel
🧩 TEKNOLOGI YANG DIGUNAKAN

Gunakan stack berikut:

Node.js (ESM)
Vercel Serverless Function
Vercel Cron
Discord Webhook
Roblox Public/Internal API
Vercel KV (Redis) untuk state management
Environment Variables

❌ Tidak boleh:

Hardcode secret
Fetch Roblox API dari frontend
Mengirim webhook setiap cron tanpa pengecekan perubahan status
🗂️ STRUKTUR PROJECT
/api
 ├── check-roblox.js        # main serverless function
 ├── services/
 │    ├── roblox.service.js
 │    ├── discord.service.js
 │    └── state.service.js
/public
 └── index.html             # optional UI (read-only)
vercel.json
.env.example
README.md
🔁 ALUR SISTEM (FLOW)
Vercel Cron memanggil endpoint /api/check-roblox
Sistem membaca username Roblox dari config
Ambil userId Roblox dari username
Cek presence/status Roblox
Ambil status terakhir dari Redis (Vercel KV)
Bandingkan:
Jika status sama → STOP (tidak kirim webhook)
Jika status berbeda → lanjut
Simpan status baru ke Redis
Kirim Discord webhook
Return JSON response (debug-friendly)
📡 ROBLOX API DETAIL
1️⃣ Username → User ID

Endpoint:

POST https://users.roblox.com/v1/usernames/users

Request Body:

{
  "usernames": ["UsernameA"],
  "excludeBannedUsers": true
}
2️⃣ Presence Status

Endpoint:

POST https://presence.roblox.com/v1/presence/users

Request Body:

{
  "userIds": [123456]
}

Mapping:

0 = offline
1 = online
2 = in_game
3 = studio
🧠 STATE MANAGEMENT (ANTI-SPAM RULE)

Gunakan Redis (Vercel KV):

Key:

roblox:status:UsernameA

Value:

offline | online | in_game | studio

Aturan:

Webhook HANYA DIKIRIM jika:
status_sekarang !== status_terakhir
🔔 DISCORD WEBHOOK RULE

Gunakan Discord Webhook, bukan bot.

Payload harus:

Clean
Informatif
Bisa pakai emoji
Bisa pakai embed (opsional)

Contoh pesan:

🔔 UsernameA sekarang ONLINE
🎮 Status: In Game
⏱️ Time: 2026-06-05 14:00 WIB
⏱️ CRON CONFIG (WAJIB)

Gunakan vercel.json:

{
  "cron": [
    {
      "path": "/api/check-roblox",
      "schedule": "*/5 * * * *"
    }
  ]
}

Aturan:

Minimal interval: 5 menit
Tidak boleh tiap detik
🔐 SECURITY RULES

WAJIB:

Discord webhook via env
Roblox API dipanggil server-side
Tidak expose webhook ke frontend
Handle error & timeout
Rate-limit logic (implicit via cron)
📄 FUNGSI SETIAP FILE
roblox.service.js
getUserId(username)
getPresence(userId)
map presence code → status string
state.service.js
getLastStatus(username)
setLastStatus(username, status)
discord.service.js
sendNotification(message / embed)
check-roblox.js
Orchestrator
Business logic utama
Tidak boleh logic berat di controller
🧪 RESPONSE FORMAT (DEBUG)

Endpoint harus return:

{
  "username": "UsernameA",
  "old_status": "offline",
  "new_status": "online",
  "webhook_sent": true,
  "timestamp": "2026-06-05T14:00:00Z"
}
🚀 GOAL AKHIR

Claude AI harus:

Menghasilkan kode lengkap
Modular & clean
Siap deploy ke Vercel
Tidak spam Discord
Mudah dikembangkan (multi user)