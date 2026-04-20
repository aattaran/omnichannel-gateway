import { EventEmitter } from 'node:events';
import { createMessage } from './normalized-message.js';

const BUILTIN_ADAPTERS = {
  telegram: () => import('./adapters/telegram.js').then((m) => m.createTelegramAdapter),
  slack: () => import('./adapters/slack.js').then((m) => m.createSlackAdapter),
  email: () => import('./adapters/email.js').then((m) => m.createEmailAdapter),
  sms: () => import('./adapters/sms.js').then((m) => m.createSmsAdapter),
  discord: () => import('./adapters/discord.js').then((m) => m.createDiscordAdapter),
};

export class Gateway extends EventEmitter {
  constructor(config = {}) {
    super();
    this._config = config;
    this._adapterFactories = new Map();
    this._adapters = new Map();
  }

  registerAdapter(channel, factory) {
    this._adapterFactories.set(channel, factory);
  }

  async start() {
    for (const channel of Object.keys(this._config)) {
      if (!this._adapterFactories.has(channel) && BUILTIN_ADAPTERS[channel]) {
        const createFn = await BUILTIN_ADAPTERS[channel]();
        this._adapterFactories.set(channel, (cfg) => createFn(cfg));
      }
    }

    for (const [channel, factory] of this._adapterFactories) {
      if (!this._config[channel]) continue;
      try {
        const adapter = factory(this._config[channel]);
        adapter.onMessage((raw) => {
          const msg = createMessage({
            channel,
            chatId: raw.chatId,
            from: raw.from,
            text: raw.text,
            type: raw.type,
            raw: raw.raw,
            replyFn: (text) => adapter.sendText(raw.chatId, text),
          });
          this.emit('message', msg);
        });
        await adapter.start();
        this._adapters.set(channel, adapter);
      } catch (err) {
        this.emit('error', err, channel);
      }
    }
  }

  async stop() {
    for (const [channel, adapter] of this._adapters) {
      try {
        await adapter.stop();
      } catch (err) {
        this.emit('error', err, channel);
      }
    }
  }

  async reply(msg, text) {
    const adapter = this._adapters.get(msg.channel);
    if (!adapter) throw new Error(`Channel "${msg.channel}" not configured`);
    return adapter.sendText(msg.chatId, text);
  }

  async send(channel, chatId, text) {
    const adapter = this._adapters.get(channel);
    if (!adapter) throw new Error(`Channel "${channel}" not configured`);
    return adapter.sendText(chatId, text);
  }

  health() {
    const status = {};
    for (const [channel, adapter] of this._adapters) {
      status[channel] = adapter.isAlive() ? 'connected' : 'disconnected';
    }
    return status;
  }
}
