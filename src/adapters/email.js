export function createEmailAdapter(config) {
  if (!config.imap) throw new Error('Email adapter requires imap config');

  let messageHandler = null;
  let pollInterval = null;
  let alive = false;
  const fromAddress = config.smtp?.user || config.imap.user;

  async function makeClient() {
    const { ImapFlow } = await import('imapflow');
    return new ImapFlow({
      host: config.imap.host,
      port: config.imap.port || 993,
      secure: true,
      auth: { user: config.imap.user, pass: config.imap.pass },
      logger: false,
    });
  }

  function stripHtml(html) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractBody(rawSource) {
    const text = typeof rawSource === 'string' ? rawSource : rawSource.toString('utf8');
    const headerEnd = text.indexOf('\r\n\r\n');
    if (headerEnd === -1) return text;
    return text.slice(headerEnd + 4).trim();
  }

  return {
    channel: 'email',

    onMessage(handler) {
      messageHandler = handler;
    },

    async start() {
      alive = true;
      if (config.pollIntervalMs && messageHandler) {
        pollInterval = setInterval(async () => {
          try {
            const emails = await this.listEmails({ limit: 5, unseen: true });
            for (const email of emails) {
              messageHandler({
                chatId: email.from,
                from: { id: email.from, email: email.from },
                text: email.subject,
                channel: 'email',
                type: 'text',
                raw: email,
              });
            }
          } catch (err) { /* poll errors are non-fatal */ }
        }, config.pollIntervalMs);
      }
    },

    async stop() {
      if (pollInterval) clearInterval(pollInterval);
      alive = false;
    },

    isAlive() {
      return alive;
    },

    async sendText(to, text) {
      if (!config.smtp) return { success: false, error: 'SMTP not configured' };
      try {
        const nodemailer = (await import('nodemailer')).default;
        const transport = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port || 587,
          secure: (config.smtp.port || 587) === 465,
          auth: { user: config.smtp.user, pass: config.smtp.pass },
        });
        const result = await transport.sendMail({
          from: fromAddress,
          to,
          subject: config.subjectPrefix || 'Message',
          text,
        });
        return { success: true, messageId: result.messageId };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async listEmails({ limit = 10, folder = 'INBOX', unseen = false } = {}) {
      const client = await makeClient();
      try {
        await client.connect();
        const lock = await client.getMailboxLock(folder);
        try {
          const criteria = unseen ? { seen: false } : { all: true };
          const uids = await client.search(criteria);
          const recent = uids.slice(-limit).reverse();
          const emails = [];
          for (const uid of recent) {
            const msg = await client.fetchOne(String(uid), { envelope: true, uid: true });
            const sender = msg.envelope.from?.[0];
            emails.push({
              uid: msg.uid,
              from: sender ? `${sender.name || ''} <${sender.address}>`.trim() : 'unknown',
              subject: msg.envelope.subject || '(no subject)',
              date: msg.envelope.date?.toISOString() || '',
            });
          }
          return emails;
        } finally {
          lock.release();
        }
      } finally {
        await client.logout();
      }
    },

    async readEmail(uid, { folder = 'INBOX' } = {}) {
      const client = await makeClient();
      try {
        await client.connect();
        const lock = await client.getMailboxLock(folder);
        try {
          const msg = await client.fetchOne(String(uid), { source: true, envelope: true });
          const rawBody = extractBody(msg.source);
          const body = stripHtml(rawBody).slice(0, 8000);
          return {
            uid,
            from: msg.envelope.from?.[0]?.address || 'unknown',
            subject: msg.envelope.subject || '',
            body,
          };
        } finally {
          lock.release();
        }
      } finally {
        await client.logout();
      }
    },
  };
}
