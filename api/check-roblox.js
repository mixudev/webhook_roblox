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

  try {
    // Get usernames to check from the state service (dynamic list with fallback to env)
    const usernames = await getMonitoredUsers();

    if (usernames.length === 0) {
      return res.status(200).json({ 
        message: 'No users configured for monitoring.', 
        results: [] 
      });
    }

    // 1. Resolve Roblox usernames to user IDs
    const users = await getUsersByUsernames(usernames);
    
    if (users.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'None of the configured Roblox usernames could be found.'
      });
    }

    const userIdMap = {}; // mapping userId -> user object
    const userIds = users.map(user => {
      userIdMap[user.id] = user;
      return user.id;
    });

    // 2. Fetch presence details for resolved user IDs
    const presences = await getUserPresences(userIds);
    const results = [];

    // 3. Process each presence update
    for (const presence of presences) {
      const userId  = presence.userId;
      const userObj = userIdMap[userId];
      
      if (!userObj) continue;

      const username    = userObj.name;
      const displayName = userObj.displayName;

      // Get current status string
      const newStatus = mapPresenceTypeToString(presence.userPresenceType);

      // Get last known status from State Service (Vercel KV or Local Fallback)
      // null means we've never seen this user before (first run)
      const oldStatus = await getLastStatus(username);

      let webhookSent = false;

      // 4. Compare and update state if changed
      if (newStatus !== oldStatus) {
        // Save new state first
        await setLastStatus(username, newStatus);

        // Skip sending notification on first run (oldStatus === null)
        // — we only notify on real transitions, not initial state discovery.
        const isFirstRun = oldStatus === null;

        if (!isFirstRun) {
          // Resolve game name if user is in-game
          let gameName = null;
          if (newStatus === 'in_game' && presence.universeId) {
            gameName = await getGameName(presence.universeId);
          }

          // Send notification to Discord
          webhookSent = await sendStatusNotification(
            username,
            oldStatus,
            newStatus,
            displayName,
            userId,
            gameName
          );

          // Add entry to history logs
          await addHistoryEntry({
            username:     username,
            displayName:  displayName,
            old_status:   oldStatus,
            new_status:   newStatus,
            webhook_sent: webhookSent
          });
        } else {
          console.log(`[Check] First-run discovery: ${username} → ${newStatus} (no notification)`);
        }
      }

      results.push({
        username:    username,
        displayName: displayName,
        userId:      userId,
        old_status:  oldStatus,
        new_status:  newStatus,
        webhook_sent: webhookSent,
        timestamp:   new Date().toISOString()
      });
    }

    // Return friendly debug/status list
    return res.status(200).json(results.length === 1 ? results[0] : { results });

  } catch (error) {
    console.error('Error executing Roblox status check:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
