import { getMonitoredUsers, addMonitoredUser, removeMonitoredUser } from './services/state.service.js';
import { getUsersByUsernames } from './services/roblox.service.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Retrieve list of monitored users
  if (req.method === 'GET') {
    try {
      const users = await getMonitoredUsers();
      return res.status(200).json({ users });
    } catch (error) {
      console.error('Error fetching monitored users:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  // POST: Add or remove users
  if (req.method === 'POST') {
    try {
      const { action, username } = req.body || {};

      if (!action || !username) {
        return res.status(400).json({ error: 'Bad Request', message: 'Parameters action and username are required.' });
      }

      if (action === 'add') {
        // Verify if the username actually exists on Roblox before adding it
        const verifiedUsers = await getUsersByUsernames([username]);
        if (verifiedUsers.length === 0) {
          return res.status(404).json({
            error: 'Not Found',
            message: `Roblox username "${username}" does not exist or is banned.`
          });
        }

        // Add to list (uses clean name from Roblox response to preserve proper capitalization)
        const robloxName = verifiedUsers[0].name;
        const updatedList = await addMonitoredUser(robloxName);
        return res.status(200).json({
          success: true,
          message: `Successfully added ${robloxName} to monitor list.`,
          users: updatedList
        });
      } 
      
      else if (action === 'remove') {
        const updatedList = await removeMonitoredUser(username);
        return res.status(200).json({
          success: true,
          message: `Successfully removed "${username}" from monitor list.`,
          users: updatedList
        });
      } 
      
      else {
        return res.status(400).json({ error: 'Bad Request', message: 'Action must be "add" or "remove".' });
      }

    } catch (error) {
      console.error('Error updating monitored users:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
