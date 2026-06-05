import { getMonitoredUsers, getLastStatus } from './services/state.service.js';

/**
 * GET /api/status
 * 
 * Public endpoint: membaca status tersimpan dari state service.
 * Tidak memerlukan autentikasi — read-only dari cache.
 * Dipanggil oleh dashboard frontend untuk menampilkan status terkini.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const usernames = await getMonitoredUsers();

    if (usernames.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const results = [];
    for (const username of usernames) {
      const cachedStatus = await getLastStatus(username);
      results.push({
        username,
        displayName: username, // cached display; real displayName dari check-roblox
        new_status: cachedStatus ?? 'unknown',
        old_status: null,
        userId: null,
        webhook_sent: false,
        timestamp: new Date().toISOString(),
        source: 'cache'
      });
    }

    return res.status(200).json({ results });

  } catch (error) {
    console.error('[Status] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
