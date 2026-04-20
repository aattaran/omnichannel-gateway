import { describe, it, expect, vi } from 'vitest';
import { createDiscordAdapter } from '../../src/adapters/discord.js';

vi.mock('discord.js', () => {
  let readyHandler = null;
  let messageHandler = null;
  return {
    Client: vi.fn().mockImplementation(() => ({
      on: vi.fn((event, handler) => {
        if (event === 'ready') readyHandler = handler;
        if (event === 'messageCreate') messageHandler = handler;
      }),
      once: vi.fn((event, handler) => {
        if (event === 'ready') readyHandler = handler;
      }),
      login: vi.fn().mockImplementation(async () => {
        if (readyHandler) readyHandler();
      }),
      destroy: vi.fn(),
      channels: {
        cache: new Map(),
        fetch: vi.fn().mockResolvedValue({ send: vi.fn().mockResolvedValue({ id: '1' }) }),
      },
      user: { tag: 'TestBot#1234', id: 'BOT_ID' },
      _simulateMessage: (msg) => messageHandler?.(msg),
    })),
    GatewayIntentBits: { Guilds: 1, GuildMessages: 2, DirectMessages: 4, MessageContent: 8 },
    Partials: { Channel: 0, Message: 1 },
  };
});

describe('createDiscordAdapter', () => {
  it('creates adapter with required methods', () => {
    const adapter = createDiscordAdapter({ token: 'fake-token' });
    expect(adapter.start).toBeDefined();
    expect(adapter.stop).toBeDefined();
    expect(adapter.sendText).toBeDefined();
    expect(adapter.onMessage).toBeDefined();
  });

  it('throws if no token', () => {
    expect(() => createDiscordAdapter({})).toThrow('token');
  });

  it('start() logs in and sets alive', async () => {
    const adapter = createDiscordAdapter({ token: 'fake-token' });
    await adapter.start();
    expect(adapter.isAlive()).toBe(true);
  });

  it('normalizes incoming messages', async () => {
    const adapter = createDiscordAdapter({ token: 'fake-token' });
    const received = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.start();

    const { Client } = await import('discord.js');
    const client = Client.mock.results[0].value;
    client._simulateMessage({
      author: { id: 'U1', username: 'alice', bot: false },
      content: 'hello discord',
      channel: { id: 'C1', send: vi.fn() },
      id: 'M1',
      createdTimestamp: 1700000000000,
    });

    expect(received).toHaveLength(1);
    expect(received[0].chatId).toBe('C1');
    expect(received[0].from.id).toBe('U1');
    expect(received[0].text).toBe('hello discord');
  });

  it('ignores bot messages', async () => {
    const adapter = createDiscordAdapter({ token: 'fake-token' });
    const received = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.start();

    const { Client } = await import('discord.js');
    const client = Client.mock.results[0].value;
    client._simulateMessage({
      author: { id: 'BOT_ID', username: 'bot', bot: true },
      content: 'i am a bot',
      channel: { id: 'C1', send: vi.fn() },
      id: 'M2',
    });

    expect(received).toHaveLength(0);
  });

  it('sendText returns success', async () => {
    const adapter = createDiscordAdapter({ token: 'fake-token' });
    await adapter.start();
    const result = await adapter.sendText('C1', 'hi');
    expect(result.success).toBe(true);
  });
});
