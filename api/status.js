import { getMonitoredUsers, getLastStatus } from './services/state.service.js';
import { getUsersByUsernames, getUserPresences, mapPresenceTypeToString } from './services/roblox.service.js';

/**
 * GET /api/status
 *
 * Public endpoint: membaca status tersimpan dari state service.
 * Tidak memerlukan autentikasi — read-only dari cache.
 * Dipanggil oleh dashboard frontend untuk menampilkan status terkini.
 *
 * Jika cache kosong (semua null/unknown), langsung fetch live dari Roblox API.
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

    // Baca cache dulu
    const cachedResults = [];
    for (const username of usernames) {
      const cachedStatus = await getLastStatus(username);
      cachedResults.push({ username, cachedStatus });
    }

    // Cek apakah semua cache kosong (null) — berarti belum pernah di-check
    const allEmpty = cachedResults.every(r => r.cachedStatus === null);

    if (!allEmpty) {
      // Ada cache, kembalikan dari cache
      const results = cachedResults.map(({ username, cachedStatus }) => ({
        username,
        displayName: username,
        new_status: cachedStatus ?? 'unknown',
        old_status: null,
        userId: null,
        webhook_sent: false,
        timestamp: new Date().toISOString(),
        source: 'cache'
      }));
      return res.status(200).json({ results });
    }

    // Cache kosong — fetch live dari Roblox API
    try {
      const users = await getUsersByUsernames(usernames);
      if (users.length === 0) {
        return res.status(200).json({ results: cachedResults.map(({ username }) => ({
          username,
          displayName: username,
          new_status: 'unknown',
          old_status: null,
          userId: null,
          webhook_sent: false,
          timestamp: new Date().toISOString(),
          source: 'cache'
        })) });
      }

      const userIdMap = {};
      const userIds = users.map(u => { userIdMap[u.id] = u; return u.id; });
      const presences = await getUserPresences(userIds);

      const results = presences.map(presence => {
        const userObj = userIdMap[presence.userId];
        if (!userObj) return null;
        return {
          username: userObj.name,
          displayName: userObj.displayName,
          new_status: mapPresenceTypeToString(presence.userPresenceType),
          old_status: null,
          userId: presence.userId,
          webhook_sent: false,
          timestamp: new Date().toISOString(),
          source: 'live'
        };
      }).filter(Boolean);

      return res.status(200).json({ results });
    } catch (liveError) {
      // Live fetch gagal, kembalikan unknown daripada error
      console.warn('[Status] Live fetch failed, returning unknown:', liveError.message);
      const results = cachedResults.map(({ username }) => ({
        username,
        displayName: username,
        new_status: 'unknown',
        old_status: null,
        userId: null,
        webhook_sent: false,
        timestamp: new Date().toISOString(),
        source: 'cache'
      }));
      return res.status(200).json({ results });
    }

  } catch (error) {
    console.error('[Status] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
