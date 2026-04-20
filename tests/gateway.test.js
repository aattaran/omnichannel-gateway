import { describe, it, expect, vi } from 'vitest';
import { Gateway } from '../src/gateway.js';

function mockAdapter(channel) {
  return {
    channel,
    started: false,
    onMessageHandler: null,
    async start() { this.started = true; },
    async stop() { this.started = false; },
    isAlive() { return this.started; },
    async sendText(chatId, text) { return { success: true }; },
    onMessage(handler) { this.onMessageHandler = handler; },
    simulateMessage(msg) { if (this.onMessageHandler) this.onMessageHandler(msg); },
  };
}

describe('Gateway', () => {
  it('constructs without throwing', () => {
    const gw = new Gateway({});
    expect(gw).toBeDefined();
  });

  it('registers adapter factory via registerAdapter', () => {
    const gw = new Gateway({});
    gw.registerAdapter('telegram', () => mockAdapter('telegram'));
    expect(gw._adapterFactories.has('telegram')).toBe(true);
  });

  it('start() creates and starts configured adapters', async () => {
    const adapter = mockAdapter('telegram');
    const gw = new Gateway({ telegram: { token: 'fake' } });
    gw.registerAdapter('telegram', () => adapter);
    await gw.start();
    expect(adapter.started).toBe(true);
  });

  it('start() skips unconfigured adapters', async () => {
    const adapter = mockAdapter('slack');
    const gw = new Gateway({ telegram: { token: 'fake' } });
    gw.registerAdapter('slack', () => adapter);
    await gw.start();
    expect(adapter.started).toBe(false);
  });

  it('stop() stops all running adapters', async () => {
    const adapter = mockAdapter('telegram');
    const gw = new Gateway({ telegram: { token: 'fake' } });
    gw.registerAdapter('telegram', () => adapter);
    await gw.start();
    await gw.stop();
    expect(adapter.started).toBe(false);
  });

  it('emits message events from adapters', async () => {
    const adapter = mockAdapter('telegram');
    const gw = new Gateway({ telegram: { token: 'fake' } });
    gw.registerAdapter('telegram', () => adapter);
    const received = [];
    gw.on('message', (msg) => received.push(msg));
    await gw.start();

    adapter.simulateMessage({
      channel: 'telegram',
      chatId: '123',
      from: { id: '1', name: 'Alice' },
      text: 'hello',
    });

    expect(received).toHaveLength(1);
    expect(received[0].text).toBe('hello');
    expect(received[0].channel).toBe('telegram');
  });

  it('emits error events per channel', async () => {
    const gw = new Gateway({ telegram: { token: 'fake' } });
    gw.registerAdapter('telegram', () => { throw new Error('connection failed'); });
    const errors = [];
    gw.on('error', (err, channel) => errors.push({ err, channel }));
    await gw.start();
    expect(errors).toHaveLength(1);
    expect(errors[0].channel).toBe('telegram');
    expect(errors[0].err.message).toBe('connection failed');
  });

  it('reply() routes to the originating adapter', async () => {
    const adapter = mockAdapter('telegram');
    const spy = vi.spyOn(adapter, 'sendText');
    const gw = new Gateway({ telegram: { token: 'fake' } });
    gw.registerAdapter('telegram', () => adapter);
    await gw.start();
    const msg = { channel: 'telegram', chatId: '42', text: 'hi' };
    await gw.reply(msg, 'pong');
    expect(spy).toHaveBeenCalledWith('42', 'pong');
  });

  it('send() sends to a specific channel and chatId', async () => {
    const adapter = mockAdapter('slack');
    const spy = vi.spyOn(adapter, 'sendText');
    const gw = new Gateway({ slack: { token: 'xoxb' } });
    gw.registerAdapter('slack', () => adapter);
    await gw.start();
    await gw.send('slack', 'C123', 'hello slack');
    expect(spy).toHaveBeenCalledWith('C123', 'hello slack');
  });

  it('send() throws for unknown channel', async () => {
    const gw = new Gateway({});
    await gw.start();
    await expect(gw.send('whatsapp', '1', 'hi')).rejects.toThrow('not configured');
  });

  it('health() returns per-channel status', async () => {
    const adapter = mockAdapter('telegram');
    const gw = new Gateway({ telegram: { token: 'fake' } });
    gw.registerAdapter('telegram', () => adapter);
    await gw.start();
    const status = gw.health();
    expect(status.telegram).toBe('connected');
  });

  it('health() shows disconnected for stopped channels', async () => {
    const adapter = mockAdapter('telegram');
    const gw = new Gateway({ telegram: { token: 'fake' } });
    gw.registerAdapter('telegram', () => adapter);
    await gw.start();
    await gw.stop();
    const status = gw.health();
    expect(status.telegram).toBe('disconnected');
  });
});
