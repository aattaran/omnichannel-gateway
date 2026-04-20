# @omnichannel/gateway

Unified messaging gateway — one API for Telegram, Slack, Email, SMS, and Discord.

Pure plumbing. No LLM. No database. No opinions. Bring your own brain.

## Quickstart

npm install @omnichannel/gateway node-telegram-bot-api @slack/bolt

```js
import { Gateway } from '@omnichannel/gateway'

const gw = new Gateway({
  telegram: { token: process.env.TELEGRAM_TOKEN },
  slack: { token: process.env.SLACK_TOKEN, appToken: process.env.SLACK_APP_TOKEN },
})

gw.on('message', async (msg) => {
  console.log(`[${msg.channel}] ${msg.from.id}: ${msg.text}`)
  await msg.reply(`Echo: ${msg.text}`)
})

await gw.start()
```

That's it. Messages from Telegram and Slack arrive in the same handler, in the same format.

## Install Only What You Need

Each channel adapter is a peer dependency. Install only the ones you use:

| Channel | Install |
|---------|---------|
| Telegram | `npm i node-telegram-bot-api` |
| Slack | `npm i @slack/bolt` |
| Email | `npm i nodemailer imapflow` |
| SMS | `npm i twilio` |
| Discord | `npm i discord.js` |

## API

### `new Gateway(config)`

```js
const gw = new Gateway({
  telegram: { token: 'BOT_TOKEN' },
  slack: { token: 'xoxb-...', appToken: 'xapp-...' },
  email: {
    imap: { host: 'imap.gmail.com', port: 993, user: '...', pass: '...' },
    smtp: { host: 'smtp.gmail.com', port: 587, user: '...', pass: '...' },
  },
  sms: { accountSid: 'AC...', authToken: '...', fromNumber: '+1...' },
  discord: { token: 'BOT_TOKEN' },
})
```

Only include channels you want. The rest are ignored.

### Events

```js
gw.on('message', (msg) => { /* NormalizedMessage */ })
gw.on('error', (err, channel) => { /* per-channel errors */ })
```

### Methods

```js
await gw.start()                        // start all configured channels
await gw.stop()                         // graceful shutdown
await gw.reply(msg, 'response text')    // reply to originating channel
await gw.send('telegram', chatId, text) // send to any channel
const status = gw.health()              // { telegram: 'connected', ... }
```

### NormalizedMessage

Every incoming message has the same shape, regardless of channel:

```js
{
  id: 'uuid',
  channel: 'telegram' | 'slack' | 'email' | 'sms' | 'discord',
  chatId: '12345',
  from: { id: '99', name: 'Alice', email: 'alice@...' },
  text: 'Hello world',
  type: 'text' | 'voice' | 'image' | 'file',
  timestamp: Date,
  raw: { /* original platform payload */ },
  reply: async (text) => { /* shortcut to reply */ },
}
```

## Examples

- [Basic echo bot](examples/basic.js)
- [Claude AI bot](examples/with-claude.js)
- [OpenAI bot](examples/with-openai.js)

## License

MIT
