'use strict';

const config = require('../config');
const { request } = require('./http');

async function sendTelegramAlert(message) {
  const { telegramBotToken, telegramChatId } = config;

  if (!telegramBotToken || !telegramChatId) {
    return; // Silently ignore if Telegram is not configured
  }

  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  
  try {
    const res = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
      }),
      timeoutMs: 10000,
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error('[telegram]', 'Telegram API error:', res.status, text);
    }
  } catch (error) {
    console.error('[telegram]', 'Failed to send alert:', error.message);
  }
}

module.exports = {
  sendTelegramAlert,
};
