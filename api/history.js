import { getHistoryLogs, clearHistoryLogs } from './services/state.service.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch history logs
  if (req.method === 'GET') {
    try {
      const logs = await getHistoryLogs();
      return res.status(200).json({ logs });
    } catch (error) {
      console.error('Error fetching history logs:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  // POST: Clear history logs
  if (req.method === 'POST') {
    try {
      const { action } = req.body || {};
      if (action === 'clear') {
        await clearHistoryLogs();
        return res.status(200).json({ 
          success: true, 
          message: 'History cleared successfully.', 
          logs: [] 
        });
      }
      return res.status(400).json({ error: 'Bad Request', message: 'Action must be "clear".' });
    } catch (error) {
      console.error('Error clearing history logs:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
