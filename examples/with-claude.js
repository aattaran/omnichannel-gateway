import { Gateway } from '../src/index.js';
import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic();

const gw = new Gateway({
  telegram: { token: process.env.TELEGRAM_TOKEN },
  slack: { token: process.env.SLACK_TOKEN, appToken: process.env.SLACK_APP_TOKEN },
});

gw.on('message', async (msg) => {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: msg.text }],
  });

  const reply = response.content[0].text;
  await msg.reply(reply);
});

await gw.start();
console.log('Claude bot running on:', Object.keys(gw.health()).join(', '));
