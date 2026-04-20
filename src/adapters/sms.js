import { splitText, delay } from '../utils.js';

const MAX_LENGTH = 1500;

export function createSmsAdapter(config) {
  if (!config.accountSid) throw new Error('SMS adapter requires accountSid');
  if (!config.authToken) throw new Error('SMS adapter requires authToken');
  if (!config.fromNumber) throw new Error('SMS adapter requires fromNumber');

  let client = null;
  let messageHandler = null;
  let alive = false;

  return {
    channel: 'sms',

    onMessage(handler) {
      messageHandler = handler;
    },

    async start() {
      const twilio = (await import('twilio')).default;
      client = twilio(config.accountSid, config.authToken);
      alive = true;
    },

    async stop() {
      client = null;
      alive = false;
    },

    isAlive() {
      return alive;
    },

    async sendText(to, text) {
      if (!client) return { success: false, error: 'Not initialized' };
      const chunks = splitText(text, MAX_LENGTH);
      try {
        for (let i = 0; i < chunks.length; i++) {
          await client.messages.create({
            body: chunks[i],
            from: config.fromNumber,
            to,
          });
          if (i < chunks.length - 1) await delay(500);
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    handleWebhook(req, res) {
      const { From, Body } = req.body || {};
      if (From && Body && messageHandler) {
        messageHandler({
          chatId: From,
          from: { id: From },
          text: Body,
          channel: 'sms',
          type: 'text',
          raw: req.body,
        });
      }
      res.set('Content-Type', 'text/xml');
      res.send('<Response></Response>');
    },
  };
}
