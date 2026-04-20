import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSlackAdapter } from '../../src/adapters/slack.js';

vi.mock('@slack/bolt', () => {
  let handler = null;
  return {
    App: vi.fn().mockImplementation(() => ({
      message: vi.fn((fn) => { handler = fn; }),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      client: {
        chat: {
          postMessage: vi.fn().mockResolvedValue({ ts: '123.456' }),
          update: vi.fn().mockResolvedValue({}),
        },
        files: { uploadV2: vi.fn().mockResolvedValue({}) },
      },
      receiver: { client: { ws: { readyState: 1 } } },
      _handler: () => handler,
    })),
  };
});

describe('createSlackAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates adapter with required methods', () => {
    const adapter = createSlackAdapter({ token: 'xoxb-test', appToken: 'xapp-test' });
    expect(adapter.start).toBeDefined();
    expect(adapter.stop).toBeDefined();
    expect(adapter.sendText).toBeDefined();
    expect(adapter.onMessage).toBeDefined();
  });

  it('throws if no token', () => {
    expect(() => createSlackAdapter({})).toThrow('token');
  });

  it('throws if no appToken', () => {
    expect(() => createSlackAdapter({ token: 'xoxb-test' })).toThrow('appToken');
  });

  it('start() connects Socket Mode', async () => {
    const adapter = createSlackAdapter({ token: 'xoxb-test', appToken: 'xapp-test' });
    await adapter.start();
    expect(adapter.isAlive()).toBe(true);
  });

  it('normalizes incoming Slack messages', async () => {
    const adapter = createSlackAdapter({ token: 'xoxb-test', appToken: 'xapp-test' });
    const received = [];
    adapter.onMessage((msg) => received.push(msg));
    await adapter.start();

    const { App } = await import('@slack/bolt');
    const app = App.mock.results[0].value;
    const h = app._handler();
    await h({
      event: { user: 'U123', text: 'hello', channel: 'C456', ts: '1700000000.000' },
      say: vi.fn(),
    });

    expect(received).toHaveLength(1);
    expect(received[0].chatId).toBe('C456');
    expect(received[0].from.id).toBe('U123');
    expect(received[0].text).toBe('hello');
    expect(received[0].channel).toBe('slack');
  });

  it('sendText chunks at 3000 chars', async () => {
    const adapter = createSlackAdapter({ token: 'xoxb-test', appToken: 'xapp-test' });
    await adapter.start();
    const { App } = await import('@slack/bolt');
    const app = App.mock.results[0].value;
    await adapter.sendText('C123', 'x'.repeat(4000));
    expect(app.client.chat.postMessage).toHaveBeenCalledTimes(2);
  });

  it('sendText returns success', async () => {
    const adapter = createSlackAdapter({ token: 'xoxb-test', appToken: 'xapp-test' });
    await adapter.start();
    const result = await adapter.sendText('C123', 'hi');
    expect(result.success).toBe(true);
  });
});
