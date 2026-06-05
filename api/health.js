import { getMonitoredUsers, getHistoryLogs } from './services/state.service.js';

/**
 * GET /api/health
 * 
 * Diagnosa semua konfigurasi sistem. Tidak perlu autentikasi.
 * Cek: env vars, Redis, Discord webhook format, monitored users, last activity.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const checks = [];

  // ── 1. CRON_SECRET ─────────────────────────────────────────────────────────
  const hasCronSecret = !!process.env.CRON_SECRET;
  checks.push({
    id: 'cron_secret',
    label: 'CRON_SECRET',
    status: hasCronSecret ? 'ok' : 'warn',
    message: hasCronSecret
      ? 'Dikonfigurasi. Endpoint /api/check-roblox aman dari akses luar.'
      : 'Belum diset. GitHub Actions bisa dipanggil siapa saja tanpa autentikasi.'
  });

  // ── 2. DISCORD WEBHOOK ─────────────────────────────────────────────────────
  const discordUrl = process.env.DISCORD_WEBHOOK_URL || '';
  const isDiscordValid = discordUrl.startsWith('https://discord.com/api/webhooks/') ||
                         discordUrl.startsWith('https://discordapp.com/api/webhooks/');
  checks.push({
    id: 'discord_webhook',
    label: 'DISCORD_WEBHOOK_URL',
    status: !discordUrl ? 'error' : isDiscordValid ? 'ok' : 'warn',
    message: !discordUrl
      ? 'Belum diset. Notifikasi tidak akan terkirim.'
      : isDiscordValid
        ? 'Dikonfigurasi dengan format yang valid.'
        : 'Diset tapi format URL tidak dikenali — pastikan URL dari Discord.'
  });

  // ── 3. UPSTASH REDIS ───────────────────────────────────────────────────────
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || '';
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';
  let redisStatus = 'error';
  let redisMessage = 'Belum dikonfigurasi. Status tidak tersimpan antar request — setiap cron dianggap first-run.';
  let redisPing = null;

  if (upstashUrl && upstashToken) {
    try {
      const start = Date.now();
      const pingRes = await fetch(`${upstashUrl}/ping`, {
        headers: { Authorization: `Bearer ${upstashToken}` }
      });
      redisPing = Date.now() - start;
      if (pingRes.ok) {
        redisStatus = 'ok';
        redisMessage = `Terhubung. Latency: ${redisPing}ms`;
      } else {
        redisStatus = 'error';
        redisMessage = `URL/Token salah — server mengembalikan HTTP ${pingRes.status}.`;
      }
    } catch (e) {
      redisStatus = 'error';
      redisMessage = `Gagal terhubung: ${e.message}`;
    }
  }

  checks.push({
    id: 'upstash_redis',
    label: 'Upstash Redis',
    status: redisStatus,
    message: redisMessage,
    ping: redisPing
  });

  // ── 4. MONITORED USERS ─────────────────────────────────────────────────────
  let monitoredUsers = [];
  try {
    monitoredUsers = await getMonitoredUsers();
  } catch (e) {
    // ignore
  }

  checks.push({
    id: 'monitored_users',
    label: 'Monitored Users',
    status: monitoredUsers.length > 0 ? 'ok' : 'warn',
    message: monitoredUsers.length > 0
      ? `${monitoredUsers.length} user aktif: ${monitoredUsers.join(', ')}`
      : 'Tidak ada user yang dimonitor. Tambahkan via Settings.',
    users: monitoredUsers
  });

  // ── 5. GITHUB ACTIONS (inferred) ───────────────────────────────────────────
  checks.push({
    id: 'github_actions',
    label: 'GitHub Actions Scheduler',
    status: 'info',
    message: 'Tidak bisa dicek dari server — pastikan workflow .github/workflows/roblox-monitor.yml sudah di-enable di repo GitHub kamu.'
  });

  // ── 6. LAST ACTIVITY ───────────────────────────────────────────────────────
  let lastActivity = null;
  try {
    const logs = await getHistoryLogs();
    if (logs.length > 0) {
      lastActivity = logs[0];
    }
  } catch (e) {
    // ignore
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const hasError = checks.some(c => c.status === 'error');
  const hasWarn  = checks.some(c => c.status === 'warn');
  const overall  = hasError ? 'error' : hasWarn ? 'warn' : 'ok';

  return res.status(200).json({
    overall,
    timestamp: new Date().toISOString(),
    checks,
    lastActivity
  });
}
