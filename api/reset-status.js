import { getMonitoredUsers, clearAllStatuses } from './services/state.service.js';

/**
 * POST /api/reset-status
 * 
 * Resets the cached presence status for monitored users.
 * The next cron/check run will detect any live status and send Discord notifications.
 * 
 * Body (optional):
 *   { "username": "SomeUser" }  → reset specific user
 *   (empty)                     → reset all monitored users
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username } = req.body || {};

    let targetUsernames;
    if (username) {
      // Reset single user
      targetUsernames = [username.trim()];
    } else {
      // Reset all monitored users
      targetUsernames = await getMonitoredUsers();
    }

    if (targetUsernames.length === 0) {
      return res.status(200).json({
        message: 'Tidak ada user yang dimonitor.',
        cleared: 0
      });
    }

    const cleared = await clearAllStatuses(targetUsernames);

    console.log(`[Reset] Status direset untuk: ${targetUsernames.join(', ')} (${cleared} entri dihapus)`);

    return res.status(200).json({
      message: `Status berhasil direset. Notifikasi akan dikirim pada pengecekan berikutnya.`,
      cleared,
      users: targetUsernames
    });

  } catch (error) {
    console.error('[Reset] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
