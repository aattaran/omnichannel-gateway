import { splitText } from '../utils.js';

const MAX_LENGTH = 4096;
const MAX_RETRIES = 3;

export function createTelegramAdapter(config) {
  if (!config.token) throw new Error('Telegram adapter requires a token');

  let bot = null;
  let messageHandler = null;
  let alive = false;

  return {
    channel: 'telegram',

    onMessage(handler) {
      messageHandler = handler;
    },

    async start() {
      const TelegramBot = (await import('node-telegram-bot-api')).default;
      bot = new TelegramBot(config.token, { polling: true });

      bot.on('message', (msg) => {
        if (!msg.text) return;
        if (messageHandler) {
          messageHandler({
            chatId: String(msg.chat.id),
            from: {
              id: String(msg.from.id),
              name: msg.from.first_name || msg.from.username || String(msg.from.id),
            },
            text: msg.text,
            channel: 'telegram',
            type: 'text',
            raw: msg,
          });
        }
      });

      alive = true;
    },

    async stop() {
      if (bot) await bot.stopPolling();
      alive = false;
    },

    isAlive() {
      return alive;
    },

    async sendText(chatId, text) {
      if (!bot) return { success: false, error: 'Not initialized' };
      const chunks = splitText(text, MAX_LENGTH);
      try {
        for (const chunk of chunks) {
          let lastErr;
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              await bot.sendMessage(chatId, chunk);
              lastErr = null;
              break;
            } catch (err) {
              lastErr = err;
              if (attempt < MAX_RETRIES - 1) {
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
              }
            }
          }
          if (lastErr) throw lastErr;
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async sendFile(chatId, filePath, caption) {
      if (!bot) return { success: false, error: 'Not initialized' };
      try {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
        if (isImage) {
          await bot.sendPhoto(chatId, filePath, { caption });
        } else {
          await bot.sendDocument(chatId, filePath, { caption });
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
  };
}
