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

## Channel Setup Guides

### Telegram (2 minutes)

1. Open Telegram, search for **@BotFather**
2. Send `/newbot`, follow prompts to name your bot
3. Copy the bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
4. Config: `{ telegram: { token: 'YOUR_BOT_TOKEN' } }`

### Slack (10-15 minutes)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From Scratch
2. Name it, pick your workspace
3. **Socket Mode** → Enable → give token a name → copy the `xapp-...` token
4. **OAuth & Permissions** → add scopes: `chat:write`, `channels:read`, `channels:history`, `groups:read`, `im:read`, `im:history`
5. **Install to Workspace** → copy the `xoxb-...` Bot Token
6. **Event Subscriptions** → Enable → Subscribe to: `message.channels`, `message.groups`, `message.im`
7. Config: `{ slack: { token: 'xoxb-...', appToken: 'xapp-...' } }`

### Discord (5 minutes)

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application**
2. **Bot** tab → **Add Bot** → copy the token
3. Enable **Message Content Intent** under Privileged Gateway Intents
4. **OAuth2** → URL Generator → select `bot` scope → permissions: Send Messages, Read Message History
5. Use the generated URL to invite the bot to your server
6. Config: `{ discord: { token: 'YOUR_BOT_TOKEN' } }`

### Email (5 minutes)

1. For Gmail: enable 2FA, then create an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. IMAP: `host: 'imap.gmail.com', port: 993`
3. SMTP: `host: 'smtp.gmail.com', port: 587`
4. Config:
```js
{
  email: {
    imap: { host: 'imap.gmail.com', port: 993, user: 'you@gmail.com', pass: 'APP_PASSWORD' },
    smtp: { host: 'smtp.gmail.com', port: 587, user: 'you@gmail.com', pass: 'APP_PASSWORD' },
  }
}
```

### SMS via Twilio (5 minutes)

1. Sign up at [twilio.com](https://www.twilio.com/) (free trial gives you a number)
2. Dashboard shows: Account SID, Auth Token
3. Buy or use trial phone number
4. Config: `{ sms: { accountSid: 'ACxxx', authToken: 'xxx', fromNumber: '+1234567890' } }`
5. For inbound SMS: point Twilio webhook to your server's `/sms` endpoint

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
