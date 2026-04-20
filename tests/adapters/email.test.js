import { describe, it, expect, vi } from 'vitest';
import { createEmailAdapter } from '../../src/adapters/email.js';

vi.mock('imapflow', () => ({
  ImapFlow: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    getMailboxLock: vi.fn().mockResolvedValue({ release: vi.fn() }),
    search: vi.fn().mockResolvedValue([1, 2]),
    fetchOne: vi.fn().mockResolvedValue({
      envelope: {
        from: [{ name: 'Bob', address: 'bob@test.com' }],
        subject: 'Test',
        date: new Date('2026-01-01'),
      },
      uid: 1,
      source: Buffer.from('Subject: Test\r\n\r\nHello body text'),
    }),
  })),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-1' }),
    }),
  },
}));

describe('createEmailAdapter', () => {
  const cfg = {
    imap: { host: 'imap.test.com', port: 993, user: 'u', pass: 'p' },
    smtp: { host: 'smtp.test.com', port: 587, user: 'u', pass: 'p' },
  };

  it('creates adapter with required methods', () => {
    const adapter = createEmailAdapter(cfg);
    expect(adapter.start).toBeDefined();
    expect(adapter.stop).toBeDefined();
    expect(adapter.sendText).toBeDefined();
    expect(adapter.onMessage).toBeDefined();
  });

  it('throws if no imap config', () => {
    expect(() => createEmailAdapter({ smtp: cfg.smtp })).toThrow('imap');
  });

  it('sendText sends email via SMTP', async () => {
    const adapter = createEmailAdapter(cfg);
    await adapter.start();
    const result = await adapter.sendText('bob@test.com', 'Hello!');
    expect(result.success).toBe(true);
  });

  it('listEmails returns message list', async () => {
    const adapter = createEmailAdapter(cfg);
    await adapter.start();
    const emails = await adapter.listEmails({ limit: 5 });
    expect(emails).toBeDefined();
    expect(Array.isArray(emails)).toBe(true);
  });

  it('readEmail returns email body', async () => {
    const adapter = createEmailAdapter(cfg);
    await adapter.start();
    const email = await adapter.readEmail(1);
    expect(email.body).toContain('Hello body text');
  });
});
