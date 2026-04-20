import { splitText } from '../utils.js';

const MAX_LENGTH = 2000;
const MAX_RETRIES = 3;

export function createDiscordAdapter(config) {
  if (!config.token) throw new Error('Discord adapter requires a token');

  let client = null;
  let messageHandler = null;
  let alive = false;
  const channelCache = new Map();

  async function getChannel(channelId) {
    if (channelCache.has(channelId)) return channelCache.get(channelId);
    const ch = client.channels.cache.get(channelId) || await client.channels.fetch(channelId);
    if (ch) channelCache.set(channelId, ch);
    return ch;
  }

  return {
    channel: 'discord',

    onMessage(handler) {
      messageHandler = handler;
    },

    async start() {
      const { Client, GatewayIntentBits, Partials } = await import('discord.js');
      client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.MessageContent,
        ],
        partials: [Partials.Channel, Partials.Message],
      });

      client.on('messageCreate', (msg) => {
        if (msg.author.bot) return;
        if (!msg.content) return;
        if (messageHandler) {
          channelCache.set(msg.channel.id, msg.channel);
          messageHandler({
            chatId: String(msg.channel.id),
            from: { id: String(msg.author.id), name: msg.author.username },
            text: msg.content,
            channel: 'discord',
            type: 'text',
            raw: msg,
          });
        }
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Discord login timed out')), 30000);
        client.once('ready', () => { clearTimeout(timeout); resolve(); });
        client.login(config.token).catch((err) => { clearTimeout(timeout); reject(err); });
      });

      alive = true;
    },

    async stop() {
      if (client) client.destroy();
      alive = false;
    },

    isAlive() {
      return alive;
    },

    async sendText(chatId, text) {
      if (!client) return { success: false, error: 'Not initialized' };
      const chunks = splitText(text, MAX_LENGTH);
      try {
        const ch = await getChannel(chatId);
        for (const chunk of chunks) {
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              await ch.send(chunk);
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
  };
}
