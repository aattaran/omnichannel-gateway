import { Gateway } from '../src/index.js';

const gw = new Gateway({
  telegram: { token: process.env.TELEGRAM_TOKEN },
  // slack: { token: process.env.SLACK_TOKEN, appToken: process.env.SLACK_APP_TOKEN },
  // discord: { token: process.env.DISCORD_TOKEN },
});

gw.on('message', async (msg) => {
  console.log(`[${msg.channel}] ${msg.from.name || msg.from.id}: ${msg.text}`);
  await msg.reply(`Echo: ${msg.text}`);
});

gw.on('error', (err, channel) => {
  console.error(`[${channel}] Error:`, err.message);
});

await gw.start();
console.log('Gateway started. Health:', gw.health());
