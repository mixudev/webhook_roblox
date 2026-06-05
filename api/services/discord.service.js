/**
 * Service untuk mengirim notifikasi ke Discord via Webhook.
 * Format: Clean embed profesional, bahasa Indonesia.
 */

// Warna embed berdasarkan status baru
const STATUS_COLORS = {
  offline: 0x36393f,  // Discord dark grey
  online:  0x57f287,  // Discord green
  in_game: 0x5865f2,  // Discord blurple
  studio:  0xfee75c   // Discord yellow
};

// Label status
const STATUS_LABEL = {
  offline: 'Offline',
  online:  'Online',
  in_game: 'In Game',
  studio:  'Roblox Studio'
};

// Indikator bullet per status
const STATUS_INDICATOR = {
  offline: '⚫',
  online:  '🟢',
  in_game: '🔵',
  studio:  '🟡'
};

/**
 * Format waktu ke zona WIB (UTC+7).
 */
function getWIBTimeString() {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date()) + ' WIB';
}

/**
 * Mengirim notifikasi perubahan status ke Discord.
 *
 * @param {string} username      - Roblox username
 * @param {string} oldStatus     - Status sebelumnya (null = belum ada data)
 * @param {string} newStatus     - Status terbaru
 * @param {string} displayName   - Display name dari profil Roblox
 * @param {number} userId        - Roblox User ID
 * @param {string|null} gameName - Nama game (jika sedang bermain)
 * @returns {Promise<boolean>}
 */
export async function sendStatusNotification(username, oldStatus, newStatus, displayName, userId, gameName = null) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[Discord] DISCORD_WEBHOOK_URL tidak dikonfigurasi. Notifikasi dilewati.');
    return false;
  }

  const name          = displayName || username;
  const profileUrl    = `https://www.roblox.com/users/${userId}/profile`;
  const avatarUrl     = `https://thumbs.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png`;
  const color         = STATUS_COLORS[newStatus] ?? STATUS_COLORS.offline;
  const newLabel      = STATUS_LABEL[newStatus] ?? newStatus;
  const oldLabel      = oldStatus ? STATUS_LABEL[oldStatus] ?? oldStatus : '—';
  const newIndicator  = STATUS_INDICATOR[newStatus] ?? '⚫';
  const oldIndicator  = oldStatus ? STATUS_INDICATOR[oldStatus] ?? '⚫' : '—';

  // Susun deskripsi singkat
  const fromStr = oldStatus ? `${oldIndicator} ${oldLabel}` : '🆕 First detected';
  const toStr   = `${newIndicator} ${newLabel}`;

  const fields = [
    {
      name: 'Pengguna',
      value: `[${name}](${profileUrl})\n\`${username}\``,
      inline: true
    },
    {
      name: 'Status',
      value: `${fromStr}  →  **${toStr}**`,
      inline: true
    }
  ];

  // Tambahkan game jika sedang bermain
  if (newStatus === 'in_game' && gameName) {
    fields.push({
      name: 'Sedang Bermain',
      value: gameName,
      inline: false
    });
  }

  const embed = {
    color,
    author: {
      name: `${name} — Perubahan Status`,
      url: profileUrl,
      icon_url: avatarUrl
    },
    fields,
    footer: {
      text: `Roblox Status Watcher  •  ${getWIBTimeString()}`
    },
    thumbnail: { url: avatarUrl }
  };

  const payload = {
    username: 'Roblox Watcher',
    avatar_url: 'https://images.rbxcdn.com/3b3770e11349f4553c36140adcb0487e.png',
    embeds: [embed]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Discord] Gagal mengirim webhook: ${response.status} - ${text}`);
      return false;
    }

    console.log(`[Discord] Notifikasi terkirim: ${username} ${fromStr} → ${toStr}`);
    return true;
  } catch (error) {
    console.error('[Discord] Error saat mengirim notifikasi:', error.message);
    return false;
  }
}

/**
 * Mengirim notifikasi uji coba ke Discord (untuk testing).
 * @returns {Promise<boolean>}
 */
export async function sendTestNotification() {
  return sendStatusNotification(
    'Builderman',
    'online',
    'in_game',
    'Builderman',
    156,
    'Adopt Me!'
  );
}
