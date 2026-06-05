import { sendTestNotification } from './services/discord.service.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(400).json({
      error: 'Konfigurasi Error',
      message: 'DISCORD_WEBHOOK_URL belum diset di environment variables.'
    });
  }

  try {
    console.log('[Test] Mengirim notifikasi uji coba ke Discord...');
    const success = await sendTestNotification();

    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Notifikasi uji coba berhasil dikirim! Cek channel Discord kamu.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Gagal mengirim notifikasi ke Discord. Pastikan URL webhook valid dan aktif.'
      });
    }
  } catch (error) {
    console.error('[Test] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
