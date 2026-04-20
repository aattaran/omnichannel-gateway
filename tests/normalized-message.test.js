import { describe, it, expect } from 'vitest';
import { createMessage, CHANNELS, MESSAGE_TYPES } from '../src/normalized-message.js';

describe('createMessage', () => {
  it('creates a text message with all required fields', () => {
    const msg = createMessage({
      channel: CHANNELS.TELEGRAM,
      chatId: '12345',
      from: { id: '99', name: 'Alice' },
      text: 'Hello world',
    });
    expect(msg.id).toBeDefined();
    expect(msg.channel).toBe('telegram');
    expect(msg.chatId).toBe('12345');
    expect(msg.from).toEqual({ id: '99', name: 'Alice' });
    expect(msg.text).toBe('Hello world');
    expect(msg.type).toBe('text');
    expect(msg.timestamp).toBeInstanceOf(Date);
    expect(msg.raw).toBeNull();
  });

  it('preserves raw platform payload', () => {
    const raw = { update_id: 1, message: { text: 'hi' } };
    const msg = createMessage({
      channel: CHANNELS.TELEGRAM, chatId: '1', from: { id: '1' }, text: 'hi', raw,
    });
    expect(msg.raw).toBe(raw);
  });

  it('sets type from input', () => {
    const msg = createMessage({
      channel: CHANNELS.SLACK, chatId: '1', from: { id: '1' }, text: '', type: MESSAGE_TYPES.VOICE,
    });
    expect(msg.type).toBe('voice');
  });

  it('generates unique ids', () => {
    const a = createMessage({ channel: 'telegram', chatId: '1', from: { id: '1' }, text: 'a' });
    const b = createMessage({ channel: 'telegram', chatId: '1', from: { id: '1' }, text: 'b' });
    expect(a.id).not.toBe(b.id);
  });

  it('attaches reply shortcut when replyFn provided', async () => {
    let sent = null;
    const replyFn = async (text) => { sent = text; };
    const msg = createMessage({
      channel: 'telegram', chatId: '1', from: { id: '1' }, text: 'hi', replyFn,
    });
    await msg.reply('pong');
    expect(sent).toBe('pong');
  });

  it('throws if reply called without replyFn', async () => {
    const msg = createMessage({
      channel: 'telegram', chatId: '1', from: { id: '1' }, text: 'hi',
    });
    await expect(msg.reply('x')).rejects.toThrow('No reply function');
  });
});

describe('CHANNELS', () => {
  it('exports all 5 channel constants', () => {
    expect(CHANNELS.TELEGRAM).toBe('telegram');
    expect(CHANNELS.SLACK).toBe('slack');
    expect(CHANNELS.EMAIL).toBe('email');
    expect(CHANNELS.SMS).toBe('sms');
    expect(CHANNELS.DISCORD).toBe('discord');
  });
});

describe('MESSAGE_TYPES', () => {
  it('exports type constants', () => {
    expect(MESSAGE_TYPES.TEXT).toBe('text');
    expect(MESSAGE_TYPES.VOICE).toBe('voice');
    expect(MESSAGE_TYPES.IMAGE).toBe('image');
    expect(MESSAGE_TYPES.FILE).toBe('file');
  });
});
