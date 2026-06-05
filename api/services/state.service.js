import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

// Check if Vercel KV is configured in environment
const isKvConfigured = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

// Local fallback store path
const LOCAL_STORE_PATH = path.join(process.cwd(), '.local-kv.json');

/**
 * Reads the local fallback store.
 * @returns {Record<string, any>}
 */
function readLocalStore() {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const data = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading local state store:', error);
  }
  return {};
}

/**
 * Writes to the local fallback store.
 * @param {Record<string, any>} store 
 */
function writeLocalStore(store) {
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing local state store:', error);
  }
}

/**
 * Gets the last known status of a Roblox user.
 * @param {string} username - Roblox username.
 * @returns {Promise<string>} Last known status (defaulting to 'offline' if not found).
 */
export async function getLastStatus(username) {
  const key = `roblox:status:${username.toLowerCase()}`;

  if (isKvConfigured) {
    try {
      const status = await kv.get(key);
      return status || 'offline';
    } catch (error) {
      console.warn('Vercel KV get error, falling back to local storage:', error.message);
    }
  }

  const store = readLocalStore();
  return store[key] || 'offline';
}

/**
 * Sets the last known status of a Roblox user.
 * @param {string} username - Roblox username.
 * @param {string} status - Current presence status ('offline' | 'online' | 'in_game' | 'studio').
 * @returns {Promise<void>}
 */
export async function setLastStatus(username, status) {
  const key = `roblox:status:${username.toLowerCase()}`;

  if (isKvConfigured) {
    try {
      await kv.set(key, status);
      return;
    } catch (error) {
      console.warn('Vercel KV set error, falling back to local storage:', error.message);
    }
  }

  const store = readLocalStore();
  store[key] = status;
  writeLocalStore(store);
}

/**
 * Gets the list of Roblox usernames to monitor.
 * @returns {Promise<string[]>}
 */
export async function getMonitoredUsers() {
  const key = 'roblox:monitored_users';
  let usersList = null;

  if (isKvConfigured) {
    try {
      usersList = await kv.get(key);
    } catch (error) {
      console.warn('Vercel KV error fetching user list, falling back to local:', error.message);
    }
  } else {
    const store = readLocalStore();
    usersList = store[key];
  }

  // If set in database, return it
  if (Array.isArray(usersList)) {
    return usersList;
  }

  // Fallback to env variables if database empty
  const envUsernames = process.env.ROBLOX_USERNAMES || '';
  return envUsernames
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

/**
 * Adds a Roblox username to the monitoring list.
 * @param {string} username
 * @returns {Promise<string[]>} New list of monitored users
 */
export async function addMonitoredUser(username) {
  const key = 'roblox:monitored_users';
  const cleanName = username.trim();
  if (!cleanName) return await getMonitoredUsers();

  const currentList = await getMonitoredUsers();
  
  // Prevent duplicates (case-insensitive check)
  const exists = currentList.some(name => name.toLowerCase() === cleanName.toLowerCase());
  if (exists) return currentList;

  const newList = [...currentList, cleanName];

  if (isKvConfigured) {
    try {
      await kv.set(key, newList);
      return newList;
    } catch (error) {
      console.warn('Vercel KV error saving user list, using local:', error.message);
    }
  }

  const store = readLocalStore();
  store[key] = newList;
  writeLocalStore(store);
  return newList;
}

/**
 * Removes a Roblox username from the monitoring list.
 * @param {string} username
 * @returns {Promise<string[]>} New list of monitored users
 */
export async function removeMonitoredUser(username) {
  const key = 'roblox:monitored_users';
  const cleanName = username.trim().toLowerCase();

  const currentList = await getMonitoredUsers();
  const newList = currentList.filter(name => name.toLowerCase() !== cleanName);

  if (isKvConfigured) {
    try {
      await kv.set(key, newList);
      return newList;
    } catch (error) {
      console.warn('Vercel KV error removing user, using local:', error.message);
    }
  }

  const store = readLocalStore();
  store[key] = newList;
  writeLocalStore(store);
  return newList;
}

/**
 * Gets recent presence changes history.
 * @returns {Promise<Object[]>}
 */
export async function getHistoryLogs() {
  const key = 'roblox:history_logs';
  let logs = null;

  if (isKvConfigured) {
    try {
      logs = await kv.get(key);
    } catch (error) {
      console.warn('Vercel KV error fetching history logs, using local:', error.message);
    }
  } else {
    const store = readLocalStore();
    logs = store[key];
  }

  return Array.isArray(logs) ? logs : [];
}

/**
 * Appends a new presence change log entry to the history.
 * Keeps max 50 entries.
 * @param {Object} entry 
 * @returns {Promise<void>}
 */
export async function addHistoryEntry(entry) {
  const key = 'roblox:history_logs';
  const currentLogs = await getHistoryLogs();
  
  // Prepend new entry
  const newLogs = [
    {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      ...entry
    },
    ...currentLogs
  ].slice(0, 50); // limit to 50 logs

  if (isKvConfigured) {
    try {
      await kv.set(key, newLogs);
      return;
    } catch (error) {
      console.warn('Vercel KV error adding history, using local:', error.message);
    }
  }

  const store = readLocalStore();
  store[key] = newLogs;
  writeLocalStore(store);
}

/**
 * Clears all presence changes history.
 * @returns {Promise<void>}
 */
export async function clearHistoryLogs() {
  const key = 'roblox:history_logs';

  if (isKvConfigured) {
    try {
      await kv.set(key, []);
      return;
    } catch (error) {
      console.warn('Vercel KV error clearing history, using local:', error.message);
    }
  }

  const store = readLocalStore();
  store[key] = [];
  writeLocalStore(store);
}

