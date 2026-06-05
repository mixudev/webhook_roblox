import { getUsersByUsernames, getUserPresences, getGameName, mapPresenceTypeToString } from './services/roblox.service.js';
import { getLastStatus, setLastStatus, getMonitoredUsers, addHistoryEntry } from './services/state.service.js';
import { sendStatusNotification } from './services/discord.service.js';

export default async function handler(req, res) {
  // Allow only GET or POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Security: Check Vercel Cron authorization if CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── Debug: log which env/state backend is active ──────────────────────────
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  console.log(`[Check] Redis backend: ${redisUrl ? redisUrl.replace(/\/\/.*@/, '//***@') : 'LOCAL FILE FALLBACK'}`);
  console.log(`[Check] Env keys present: UPSTASH_REDIS_REST_URL=${!!process.env.UPSTASH_REDIS_REST_URL}, KV_REST_API_URL=${!!process.env.KV_REST_API_URL}, DISCORD_WEBHOOK_URL=${!!process.env.DISCORD_WEBHOOK_URL}`);

  try {
    const usernames = await getMonitoredUsers();
    console.log(`[Check] Monitoring ${usernames.length} users: ${usernames.join(', ')}`);

    if (usernames.length === 0) {
      return res.status(200).json({
        message: 'No users configured for monitoring.',
        results: []
      });
    }

    // 1. Resolve usernames → user IDs
    const users = await getUsersByUsernames(usernames);
    console.log(`[Check] Resolved ${users.length}/${usernames.length} usernames to IDs`);

    if (users.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'None of the configured Roblox usernames could be found.'
      });
    }

    const userIdMap = {};
    const userIds = users.map(user => {
      userIdMap[user.id] = user;
      return user.id;
    });

    // 2. Fetch presence
    const presences = await getUserPresences(userIds);
    console.log(`[Check] Got presence for ${presences.length} users`);

    const results = [];

    // 3. Process each user
    for (const presence of presences) {
      const userId  = presence.userId;
      const userObj = userIdMap[userId];
      if (!userObj) continue;

      const username    = userObj.name;
      const displayName = userObj.displayName;
      const newStatus   = mapPresenceTypeToString(presence.userPresenceType);
      const oldStatus   = await getLastStatus(username);

      console.log(`[Check] ${username}: oldStatus=${oldStatus ?? 'null(first-run)'} → newStatus=${newStatus}`);

      let webhookSent = false;

      if (newStatus !== oldStatus) {
        await setLastStatus(username, newStatus);
        console.log(`[Check] ${username}: status changed, saved to store`);

        const isFirstRun = oldStatus === null;
        if (!isFirstRun) {
          // Resolve game name if in-game
          let gameName = null;
          if (newStatus === 'in_game' && presence.universeId) {
            gameName = await getGameName(presence.universeId);
            console.log(`[Check] ${username}: in_game → gameName=${gameName}`);
          }

          // Send Discord notification
          console.log(`[Check] ${username}: sending Discord notification...`);
          webhookSent = await sendStatusNotification(
            username,
            oldStatus,
            newStatus,
            displayName,
            userId,
            gameName
          );
          console.log(`[Check] ${username}: Discord webhook sent=${webhookSent}`);

          // Save to history
          await addHistoryEntry({
            username,
            displayName,
            old_status:   oldStatus,
            new_status:   newStatus,
            webhook_sent: webhookSent
          });
        } else {
          console.log(`[Check] ${username}: first-run discovery → ${newStatus} (no notification)`);
        }
      } else {
        console.log(`[Check] ${username}: no change (${newStatus})`);
      }

      results.push({
        username,
        displayName,
        userId,
        old_status:   oldStatus,
        new_status:   newStatus,
        webhook_sent: webhookSent,
        timestamp:    new Date().toISOString()
      });
    }

    console.log(`[Check] Done. ${results.filter(r => r.webhook_sent).length} notifications sent.`);
    return res.status(200).json(results.length === 1 ? results[0] : { results });

  } catch (error) {
    console.error('[Check] Fatal error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
}
