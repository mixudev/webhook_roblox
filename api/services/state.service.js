import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

// Check if Upstash Redis is configured in environment
// Vercel Marketplace (Upstash) provides: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
const isRedisConfigured = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

let redis = null;
if (isRedisConfigured) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  });
}

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
 * Returns null if user has never been seen before (first run).
 * @param {string} username - Roblox username.
 * @returns {Promise<string|null>} Last known status, or null if never seen.
 */
export async function getLastStatus(username) {
  const key = `roblox:status:${username.toLowerCase()}`;

  if (redis) {
    try {
      const status = await redis.get(key);
      return status ?? null;
    } catch (error) {
      console.warn('[State] Redis get error, falling back to local:', error.message);
    }
  }

  const store = readLocalStore();
  const val = store[key];
  return val !== undefined ? val : null;
}

/**
 * Sets the last known status of a Roblox user.
 * @param {string} username - Roblox username.
 * @param {string} status - Current presence status.
 * @returns {Promise<void>}
 */
export async function setLastStatus(username, status) {
  const key = `roblox:status:${username.toLowerCase()}`;

  if (redis) {
    try {
      await redis.set(key, status);
      return;
    } catch (error) {
      console.warn('[State] Redis set error, falling back to local:', error.message);
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

  if (redis) {
    try {
      usersList = await redis.get(key);
    } catch (error) {
      console.warn('[State] Redis error fetching user list, falling back to local:', error.message);
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

  if (redis) {
    try {
      await redis.set(key, newList);
      return newList;
    } catch (error) {
      console.warn('[State] Redis error saving user list, using local:', error.message);
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

  if (redis) {
    try {
      await redis.set(key, newList);
      return newList;
    } catch (error) {
      console.warn('[State] Redis error removing user, using local:', error.message);
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

  if (redis) {
    try {
      logs = await redis.get(key);
    } catch (error) {
      console.warn('[State] Redis error fetching history logs, using local:', error.message);
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

  const newLogs = [
    {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      ...entry
    },
    ...currentLogs
  ].slice(0, 50);

  if (redis) {
    try {
      await redis.set(key, newLogs);
      return;
    } catch (error) {
      console.warn('[State] Redis error adding history, using local:', error.message);
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

  if (redis) {
    try {
      await redis.set(key, []);
      return;
    } catch (error) {
      console.warn('[State] Redis error clearing history, using local:', error.message);
    }
  }

  const store = readLocalStore();
  store[key] = [];
  writeLocalStore(store);
}

/**
 * Clears cached status for a list of usernames (or all if no list provided).
 * Forces the next check to re-detect and send notifications.
 * @param {string[]} [usernames]
 * @returns {Promise<number>} Number of entries cleared.
 */
export async function clearAllStatuses(usernames) {
  let cleared = 0;

  if (redis) {
    try {
      if (usernames && usernames.length > 0) {
        for (const username of usernames) {
          await redis.del(`roblox:status:${username.toLowerCase()}`);
          cleared++;
        }
      } else {
        // Scan and delete all roblox:status:* keys
        let cursor = 0;
        do {
          const [nextCursor, keys] = await redis.scan(cursor, { match: 'roblox:status:*', count: 100 });
          cursor = nextCursor;
          for (const key of keys) {
            await redis.del(key);
            cleared++;
          }
        } while (cursor !== 0);
      }
      return cleared;
    } catch (error) {
      console.warn('[State] Redis error clearing statuses, using local:', error.message);
    }
  }

  // Local fallback
  const store = readLocalStore();
  if (usernames && usernames.length > 0) {
    for (const username of usernames) {
      const key = `roblox:status:${username.toLowerCase()}`;
      if (key in store) {
        delete store[key];
        cleared++;
      }
    }
  } else {
    for (const key of Object.keys(store)) {
      if (key.startsWith('roblox:status:')) {
        delete store[key];
        cleared++;
      }
    }
  }
  writeLocalStore(store);
  return cleared;
}
