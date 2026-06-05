/**
 * Service untuk mengirim notifikasi ke Discord via Webhook.
 * Format: Rich Embed dengan bahasa Indonesia.
 */

// Warna embed berdasarkan status
const STATUS_COLORS = {
  offline: 0x4a5568,   // Abu-abu gelap
  online:  0x38a169,   // Hijau
  in_game: 0x3182ce,   // Biru
  studio:  0xdd6b20    // Oranye
};

// Emoji status
const STATUS_EMOJI = {
  offline: '⚫',
  online:  '🟢',
  in_game: '🎮',
  studio:  '🛠️'
};

// Label status dalam bahasa Indonesia
const STATUS_LABEL = {
  offline: 'Offline',
  online:  'Online',
  in_game: 'Sedang Bermain',
  studio:  'Roblox Studio'
};

// Pesan transisi berdasarkan status baru
function getTransitionMessage(username, displayName, oldStatus, newStatus) {
  const name = displayName || username;

  switch (newStatus) {
    case 'online':
      return {
        title: `🟢 ${name} Baru Saja Online`,
        description: `**${name}** kini **online** di Roblox.\nSebelumnya: ${STATUS_EMOJI[oldStatus]} ${STATUS_LABEL[oldStatus]}`
      };
    case 'in_game':
      return {
        title: `🎮 ${name} Sedang Main Game`,
        description: `**${name}** sedang **bermain game** di Roblox.\nSebelumnya: ${STATUS_EMOJI[oldStatus]} ${STATUS_LABEL[oldStatus]}`
      };
    case 'studio':
      return {
        title: `🛠️ ${name} Membuka Roblox Studio`,
        description: `**${name}** sedang membuka **Roblox Studio**.\nSebelumnya: ${STATUS_EMOJI[oldStatus]} ${STATUS_LABEL[oldStatus]}`
      };
    case 'offline':
    default:
      return {
        title: `⚫ ${name} Offline`,
        description: `**${name}** telah **offline** dari Roblox.\nSebelumnya: ${STATUS_EMOJI[oldStatus]} ${STATUS_LABEL[oldStatus]}`
      };
  }
}

/**
 * Format waktu ke zona WIB (UTC+7) dalam bahasa Indonesia.
 */
function getWIBTimeString() {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date()) + ' WIB';
}

/**
 * Mengirim notifikasi perubahan status ke Discord.
 * 
 * @param {string} username - Roblox username
 * @param {string} oldStatus - Status sebelumnya
 * @param {string} newStatus - Status terbaru
 * @param {string} displayName - Display name dari profil Roblox
 * @param {number} userId - Roblox User ID
 * @param {string|null} gameName - Nama game (jika sedang bermain)
 * @returns {Promise<boolean>}
 */
export async function sendStatusNotification(username, oldStatus, newStatus, displayName, userId, gameName = null) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[Discord] DISCORD_WEBHOOK_URL tidak dikonfigurasi. Notifikasi dilewati.');
    return false;
  }

  const { title, description } = getTransitionMessage(username, displayName, oldStatus, newStatus);
  const color = STATUS_COLORS[newStatus] ?? STATUS_COLORS.offline;
  const robloxProfileUrl = `https://www.roblox.com/users/${userId}/profile`;
  const avatarUrl = `https://thumbs.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png`;

  // Buat list field
  const fields = [
    {
      name: '👤 Username',
      value: `[\`${username}\`](${robloxProfileUrl})`,
      inline: true
    },
    {
      name: `${STATUS_EMOJI[newStatus]} Status Sekarang`,
      value: `**${STATUS_LABEL[newStatus]}**`,
      inline: true
    }
  ];

  // Tambah field nama game jika sedang bermain
  if (newStatus === 'in_game' && gameName) {
    fields.push({
      name: '🕹️ Sedang Bermain',
      value: gameName,
      inline: false
    });
  }

  // Tambah field status sebelumnya
  fields.push({
    name: '🔄 Perubahan Status',
    value: `${STATUS_EMOJI[oldStatus]} ${STATUS_LABEL[oldStatus]}  →  ${STATUS_EMOJI[newStatus]} ${STATUS_LABEL[newStatus]}`,
    inline: false
  });

  // Tambah field waktu
  fields.push({
    name: '🕐 Waktu',
    value: getWIBTimeString(),
    inline: false
  });

  const embed = {
    title,
    description,
    color,
    url: robloxProfileUrl,
    thumbnail: {
      url: avatarUrl
    },
    fields,
    footer: {
      text: 'Roblox Status Watcher · Monitor Otomatis',
      icon_url: 'https://images.rbxcdn.com/3b3770e11349f4553c36140adcb0487e.png'
    },
    timestamp: new Date().toISOString()
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

    console.log(`[Discord] Notifikasi terkirim: ${username} → ${newStatus}`);
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
    'RobloxDev',
    'offline',
    'in_game',
    'Roblox Developer',
    1,
    'Adopt Me!'
  );
}
