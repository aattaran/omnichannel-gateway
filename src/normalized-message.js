import { randomUUID } from 'node:crypto';

export const CHANNELS = {
  TELEGRAM: 'telegram',
  SLACK: 'slack',
  EMAIL: 'email',
  SMS: 'sms',
  DISCORD: 'discord',
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  VOICE: 'voice',
  IMAGE: 'image',
  FILE: 'file',
};

export function createMessage({ channel, chatId, from, text, type, timestamp, raw, replyFn }) {
  return {
    id: randomUUID(),
    channel,
    chatId: String(chatId),
    from: {
      id: String(from.id),
      ...(from.name && { name: from.name }),
      ...(from.email && { email: from.email }),
    },
    text: text ?? '',
    type: type ?? MESSAGE_TYPES.TEXT,
    timestamp: timestamp ?? new Date(),
    raw: raw ?? null,
    reply: async (responseText) => {
      if (!replyFn) throw new Error('No reply function attached to this message');
      return replyFn(responseText);
    },
  };
}
