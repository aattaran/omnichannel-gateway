import { splitText } from '../utils.js';

const MAX_LENGTH = 3000;
const MAX_RETRIES = 3;

export function createSlackAdapter(config) {
  if (!config.token) throw new Error('Slack adapter requires a token');
  if (!config.appToken) throw new Error('Slack adapter requires an appToken for Socket Mode');

  let app = null;
  let messageHandler = null;
  let alive = false;

  return {
    channel: 'slack',

    onMessage(handler) {
      messageHandler = handler;
    },

    async start() {
      const { App } = await import('@slack/bolt');
      app = new App({
        token: config.token,
        appToken: config.appToken,
        socketMode: true,
      });

      app.message(async ({ event, say }) => {
        if (event.bot_id || event.subtype) return;
        if (!event.text) return;
        if (messageHandler) {
          messageHandler({
            chatId: String(event.channel),
            from: { id: String(event.user) },
            text: event.text,
            channel: 'slack',
            type: 'text',
            raw: event,
          });
        }
      });

      await app.start();
      alive = true;
    },

    async stop() {
      if (app) await app.stop();
      alive = false;
    },

    isAlive() {
      if (!app) return false;
      try {
        return alive && app.receiver.client.ws.readyState === 1;
      } catch {
        return alive;
      }
    },

    async sendText(chatId, text) {
      if (!app) return { success: false, error: 'Not initialized' };
      const chunks = splitText(text, MAX_LENGTH);
      try {
        for (const chunk of chunks) {
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              await app.client.chat.postMessage({ channel: chatId, text: chunk });
              break;
            } catch (err) {
              if (attempt === MAX_RETRIES - 1) throw err;
              await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async sendFile(chatId, filePath, caption) {
      if (!app) return { success: false, error: 'Not initialized' };
      try {
        const fs = await import('node:fs');
        await app.client.files.uploadV2({
          channel_id: chatId,
          file: fs.createReadStream(filePath),
          initial_comment: caption,
        });
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
  };
}
