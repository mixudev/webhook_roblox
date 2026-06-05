import { getMonitoredUsers, getHistoryLogs } from './services/state.service.js';

/**
 * GET /api/health
 *
 * Diagnosa semua konfigurasi sistem. Tidak perlu autentikasi.
 * Cek: env vars, Redis (KV_REST_API_* atau UPSTASH_REDIS_REST_*), Discord, monitored users.
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

  // ── 3. UPSTASH REDIS — support KV_REST_API_* dan UPSTASH_REDIS_REST_* ──────
  const redisUrl   = process.env.UPSTASH_REDIS_REST_URL   || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  // Detect which env var names are being used (for debug info)
  const redisEnvSource = process.env.UPSTASH_REDIS_REST_URL
    ? 'UPSTASH_REDIS_REST_URL'
    : process.env.KV_REST_API_URL
      ? 'KV_REST_API_URL'
      : null;

  let redisStatus  = 'error';
  let redisMessage = 'Belum dikonfigurasi (KV_REST_API_URL / UPSTASH_REDIS_REST_URL tidak ditemukan). Status tidak tersimpan antar request — setiap cron dianggap first-run.';
  let redisPing    = null;

  if (redisUrl && redisToken) {
    try {
      const start = Date.now();
      const pingRes = await fetch(`${redisUrl}/ping`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      redisPing = Date.now() - start;
      const body = await pingRes.text();

      if (pingRes.ok) {
        redisStatus  = 'ok';
        redisMessage = `Terhubung via ${redisEnvSource}. Latency: ${redisPing}ms`;
      } else {
        redisStatus  = 'error';
        redisMessage = `Token/URL salah — HTTP ${pingRes.status}: ${body.slice(0, 100)}`;
      }
    } catch (e) {
      redisStatus  = 'error';
      redisMessage = `Gagal terhubung ke ${redisUrl}: ${e.message}`;
    }
  }

  checks.push({
    id: 'upstash_redis',
    label: 'Upstash Redis (KV)',
    status: redisStatus,
    message: redisMessage,
    ping: redisPing,
    envSource: redisEnvSource
  });

  // ── 4. MONITORED USERS ─────────────────────────────────────────────────────
  let monitoredUsers = [];
  try {
    monitoredUsers = await getMonitoredUsers();
  } catch (e) { /* ignore */ }

  checks.push({
    id: 'monitored_users',
    label: 'Monitored Users',
    status: monitoredUsers.length > 0 ? 'ok' : 'warn',
    message: monitoredUsers.length > 0
      ? `${monitoredUsers.length} user aktif: ${monitoredUsers.join(', ')}`
      : 'Tidak ada user yang dimonitor. Tambahkan via Settings.',
    users: monitoredUsers
  });

  // ── 5. ROBLOX API ──────────────────────────────────────────────────────────
  let robloxStatus  = 'ok';
  let robloxMessage = 'Roblox API dapat dijangkau.';
  let robloxPing    = null;
  try {
    const start = Date.now();
    const r = await fetch('https://users.roblox.com/v1/users/1', { headers: { Accept: 'application/json' } });
    robloxPing = Date.now() - start;
    if (!r.ok) {
      robloxStatus  = 'warn';
      robloxMessage = `Roblox API merespons HTTP ${r.status}. Pengecekan mungkin gagal.`;
    } else {
      robloxMessage = `Roblox API OK. Latency: ${robloxPing}ms`;
    }
  } catch (e) {
    robloxStatus  = 'error';
    robloxMessage = `Tidak bisa menjangkau Roblox API: ${e.message}`;
  }

  checks.push({
    id: 'roblox_api',
    label: 'Roblox API',
    status: robloxStatus,
    message: robloxMessage,
    ping: robloxPing
  });

  // ── 6. GITHUB ACTIONS ──────────────────────────────────────────────────────
  checks.push({
    id: 'github_actions',
    label: 'GitHub Actions Scheduler',
    status: 'info',
    message: 'Tidak bisa dicek dari server — pastikan workflow roblox-monitor.yml sudah aktif di tab Actions repo GitHub.'
  });

  // ── 7. LAST ACTIVITY ───────────────────────────────────────────────────────
  let lastActivity = null;
  try {
    const logs = await getHistoryLogs();
    if (logs.length > 0) lastActivity = logs[0];
  } catch (e) { /* ignore */ }

  // ── Summary ────────────────────────────────────────────────────────────────
  const hasError = checks.some(c => c.status === 'error');
  const hasWarn  = checks.some(c => c.status === 'warn');
  const overall  = hasError ? 'error' : hasWarn ? 'warn' : 'ok';

  return res.status(200).json({
    overall,
    timestamp: new Date().toISOString(),
    checks,
    lastActivity,
    // Debug info: show which env vars are present (no values, just presence)
    _debug: {
      env_keys_present: [
        'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
        'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'KV_URL', 'REDIS_URL',
        'DISCORD_WEBHOOK_URL', 'CRON_SECRET', 'ROBLOX_USERNAMES'
      ].filter(k => !!process.env[k])
    }
  });
}
