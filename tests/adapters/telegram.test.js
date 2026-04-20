import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTelegramAdapter } from '../../src/adapters/telegram.js';

vi.mock('node-telegram-bot-api', () => {
  const handlers = {};
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn((event, handler) => { handlers[event] = handler; }),
      sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
      sendDocument: vi.fn().mockResolvedValue({}),
      sendPhoto: vi.fn().mockResolvedValue({}),
      stopPolling: vi.fn().mockResolvedValue(undefined),
      _handlers: handlers,
      _simulateMessage: (msg) => handlers.message?.(msg),
    })),
  };
});

describe('createTelegramAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates adapter with required methods', () => {
    const adapter = createTelegramAdapter({ token: 'fake-token' });
    expect(adapter.start).toBeDefined();
    expect(adapter.stop).toBeDefined();
    expect(adapter.sendText).toBeDefined();
    expect(adapter.isAlive).toBeDefined();
    expect(adapter.onMessage).toBeDefined();
  });

  it('throws if no token provided', () => {
    expect(() => createTelegramAdapter({})).toThrow('token');
  });

  it('start() initializes bot and begins polling', async () => {
    const adapter = createTelegramAdapter({ token: 'fake-token' });
    await adapter.start();
    expect(adapter.isAlive()).toBe(true);
  });

  it('stop() stops polling', async () => {
    const adapter = createTelegramAdapter({ token: 'fake-token' });
    await adapter.start();
    await adapter.stop();
    expect(adapter.isAlive()).toBe(false);
  });

  it('normalizes incoming messages', async () => {
    const adapter = createTelegramAdapter({ token: 'fake-token' });
    const received = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.start();

    const TelegramBot = (await import('node-telegram-bot-api')).default;
    const bot = TelegramBot.mock.results[0].value;
    bot._simulateMessage({
      message_id: 42,
      chat: { id: 123 },
      from: { id: 99, first_name: 'Alice' },
      text: 'hello',
      date: 1700000000,
    });

    expect(received).toHaveLength(1);
    expect(received[0].chatId).toBe('123');
    expect(received[0].from.id).toBe('99');
    expect(received[0].from.name).toBe('Alice');
    expect(received[0].text).toBe('hello');
    expect(received[0].channel).toBe('telegram');
  });

  it('sendText chunks long messages at 4096 chars', async () => {
    const adapter = createTelegramAdapter({ token: 'fake-token' });
    await adapter.start();
    const TelegramBot = (await import('node-telegram-bot-api')).default;
    const bot = TelegramBot.mock.results[0].value;
    await adapter.sendText('123', 'a'.repeat(5000));
    expect(bot.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('sendText returns success result', async () => {
    const adapter = createTelegramAdapter({ token: 'fake-token' });
    await adapter.start();
    const result = await adapter.sendText('123', 'hi');
    expect(result.success).toBe(true);
  });

  it('sendText returns error on failure', async () => {
    const adapter = createTelegramAdapter({ token: 'fake-token' });
    await adapter.start();
    const TelegramBot = (await import('node-telegram-bot-api')).default;
    const bot = TelegramBot.mock.results[0].value;
    bot.sendMessage.mockRejectedValue(new Error('network error'));
    const result = await adapter.sendText('123', 'hi');
    expect(result.success).toBe(false);
    expect(result.error).toBe('network error');
  });
});
