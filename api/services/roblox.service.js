/**
 * Service to interact with Roblox Web APIs.
 */

/**
 * Resolves a list of usernames to their Roblox user IDs and metadata.
 * @param {string[]} usernames - Array of Roblox usernames.
 * @returns {Promise<Object[]>} Array of user objects containing id, name, and displayName.
 */
export async function getUsersByUsernames(usernames) {
  if (!usernames || usernames.length === 0) {
    return [];
  }

  const response = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      usernames: usernames,
      excludeBannedUsers: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Roblox API users lookup failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  // Returns [{ requestedUsername, hasVerifiedBadge, id, name, displayName }]
  return data.data || [];
}

/**
 * Gets presence status details for a list of Roblox user IDs.
 * @param {number[]} userIds - Array of Roblox user IDs.
 * @returns {Promise<Object[]>} Array of presence records.
 * Each record includes: { userPresenceType, lastLocation, placeId, rootPlaceId, gameId, universeId, userId, lastOnline }
 */
export async function getUserPresences(userIds) {
  if (!userIds || userIds.length === 0) {
    return [];
  }

  const response = await fetch('https://presence.roblox.com/v1/presence/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      userIds: userIds
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Roblox API presence lookup failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.userPresences || [];
}

/**
 * Gets the name of a Roblox game/place by universeId.
 * Returns null if not found or request fails.
 * @param {number} universeId
 * @returns {Promise<string|null>}
 */
export async function getGameName(universeId) {
  if (!universeId) return null;
  try {
    const response = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].name || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Maps Roblox numeric userPresenceType to status string.
 * Presence Types:
 * 0 = Offline
 * 1 = Online (Website)
 * 2 = InGame
 * 3 = Studio
 * @param {number} presenceType
 * @returns {string}
 */
export function mapPresenceTypeToString(presenceType) {
  switch (presenceType) {
    case 0: return 'offline';
    case 1: return 'online';
    case 2: return 'in_game';
    case 3: return 'studio';
    default: return 'offline';
  }
}
