import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSmsAdapter } from '../../src/adapters/sms.js';

vi.mock('twilio', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({ sid: 'SM123' }),
    },
  })),
}));

describe('createSmsAdapter', () => {
  const cfg = { accountSid: 'AC123', authToken: 'tok', fromNumber: '+1234567890' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates adapter with required methods', () => {
    const adapter = createSmsAdapter(cfg);
    expect(adapter.start).toBeDefined();
    expect(adapter.stop).toBeDefined();
    expect(adapter.sendText).toBeDefined();
    expect(adapter.onMessage).toBeDefined();
  });

  it('throws if missing accountSid', () => {
    expect(() => createSmsAdapter({ authToken: 'x', fromNumber: '+1' })).toThrow('accountSid');
  });

  it('sendText sends via Twilio', async () => {
    const adapter = createSmsAdapter(cfg);
    await adapter.start();
    const result = await adapter.sendText('+9876543210', 'hi');
    expect(result.success).toBe(true);
  });

  it('sendText chunks long messages at 1500 chars', async () => {
    const adapter = createSmsAdapter(cfg);
    await adapter.start();
    const twilio = (await import('twilio')).default;
    const client = twilio.mock.results[0].value;
    await adapter.sendText('+9876543210', 'x'.repeat(2000));
    expect(client.messages.create).toHaveBeenCalledTimes(2);
  });

  it('handleWebhook normalizes inbound SMS', () => {
    const adapter = createSmsAdapter(cfg);
    const received = [];
    adapter.onMessage((msg) => received.push(msg));

    const req = { body: { From: '+9876543210', Body: 'hello' } };
    const res = { set: vi.fn(), send: vi.fn() };
    adapter.handleWebhook(req, res);

    expect(received).toHaveLength(1);
    expect(received[0].from.id).toBe('+9876543210');
    expect(received[0].text).toBe('hello');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<Response'));
  });
});
