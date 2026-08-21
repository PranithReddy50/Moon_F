require('dotenv').config();

const path = require('path');
const express = require('express');

const app = express();

const cors = require('cors');
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Turns a raw User-Agent string into a short, human-readable label.
 * Falls back to a trimmed version of the raw string if nothing matches.
 */
function formatUserAgent(rawUA) {
  if (!rawUA || typeof rawUA !== 'string') return 'Unknown device';

  const ua = rawUA;
  const isAndroid = /Android/i.test(ua);
  const isIphone = /iPhone/i.test(ua);
  const isIpad = /iPad/i.test(ua);
  const isMac = /Macintosh/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !isAndroid;

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/CriOS/i.test(ua)) browser = 'Chrome';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && (isIphone || isIpad || isMac)) browser = 'Safari';

  let platform = 'Unknown';
  if (isAndroid) platform = 'Android';
  else if (isIphone) platform = 'iPhone';
  else if (isIpad) platform = 'iPad';
  else if (isMac) platform = 'macOS';
  else if (isWindows) platform = 'Windows';
  else if (isLinux) platform = 'Linux';

  const label = `${platform} ${browser}`.trim();

  if (label === 'Unknown Browser') {
    return ua.length > 60 ? `${ua.slice(0, 57)}...` : ua;
  }

  return label;
}

/** Produces a readable "YYYY-MM-DD HH:mm:ss" timestamp for the server's local time. */
function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

app.post('/api/send', async (req, res) => {
  try {
    const { text, clicked, screen, language } = req.body || {};

    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Empty message.' });
    }

    if (clicked !== 'send' && clicked !== 'send&clear') {
      return res.status(400).json({ success: false, error: 'Invalid clicked value.' });
    }

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment.');
      return res.status(500).json({ success: false, error: 'Server is not configured yet.' });
    }

    const rawUA = req.headers['user-agent'] || '';
    const readableUA = formatUserAgent(rawUA);
    const safeScreen = typeof screen === 'string' && screen.trim() ? screen.trim() : 'Unknown';
    const safeLanguage = typeof language === 'string' && language.trim() ? language.trim() : 'Unknown';
    const timestamp = formatTimestamp(new Date());

    const message =
      `📲 New Visitor\n\n` +
      `User-Agent: ${readableUA}\n` +
      `Screen: ${safeScreen}\n` +
      `Language: ${safeLanguage}\n` +
      `Time: ${timestamp}\n\n` +
      `Result: "${text}", clicked: ${clicked}`;

    const telegramURL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const telegramResponse = await fetch(telegramURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
      }),
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramData.ok) {
      console.error('Telegram API error:', telegramData);
      return res.status(502).json({ success: false, error: 'Telegram delivery failed.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unexpected error in /send:', err);
    return res.status(500).json({ success: false, error: 'Unexpected server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`Moon feedback server running on port ${PORT}`);
});
