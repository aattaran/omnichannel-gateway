import { describe, it, expect, vi } from 'vitest';
import { Gateway, CHANNELS, MESSAGE_TYPES } from '../src/index.js';

vi.mock('node-telegram-bot-api', () => {
  let handler = null;
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn((ev, h) => { if (ev === 'message') handler = h; }),
      sendMessage: vi.fn().mockResolvedValue({}),
      stopPolling: vi.fn(),
      _fire: (msg) => handler?.(msg),
    })),
  };
});

describe('Gateway integration', () => {
  it('receives messages from Telegram adapter via Gateway events', async () => {
    const gw = new Gateway({ telegram: { token: 'test' } });
    const messages = [];
    gw.on('message', (msg) => messages.push(msg));
    await gw.start();

    const TelegramBot = (await import('node-telegram-bot-api')).default;
    const bot = TelegramBot.mock.results[0].value;
    bot._fire({
      message_id: 1,
      chat: { id: 100 },
      from: { id: 200, first_name: 'Test' },
      text: 'integration test',
      date: 1700000000,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].channel).toBe('telegram');
    expect(messages[0].text).toBe('integration test');
    expect(messages[0].id).toBeDefined();
    expect(messages[0].reply).toBeInstanceOf(Function);

    await gw.stop();
  });

  it('reply() routes back through the correct adapter', async () => {
    const gw = new Gateway({ telegram: { token: 'test' } });
    const messages = [];
    gw.on('message', (msg) => messages.push(msg));
    await gw.start();

    const TelegramBot = (await import('node-telegram-bot-api')).default;
    const bot = TelegramBot.mock.results.at(-1).value;
    bot._fire({
      message_id: 1,
      chat: { id: 100 },
      from: { id: 200, first_name: 'Test' },
      text: 'ping',
      date: 1700000000,
    });

    await gw.reply(messages[0], 'pong');
    expect(bot.sendMessage).toHaveBeenCalledWith('100', 'pong');

    await gw.stop();
  });

  it('health() reflects adapter state', async () => {
    const gw = new Gateway({ telegram: { token: 'test' } });
    await gw.start();
    const h = gw.health();
    expect(h.telegram).toBe('connected');
    await gw.stop();
    const h2 = gw.health();
    expect(h2.telegram).toBe('disconnected');
  });

  it('exports CHANNELS and MESSAGE_TYPES', () => {
    expect(CHANNELS.TELEGRAM).toBe('telegram');
    expect(MESSAGE_TYPES.TEXT).toBe('text');
  });
});
