import { Gateway } from '../src/index.js';
import OpenAI from 'openai';

const openai = new OpenAI();

const gw = new Gateway({
  telegram: { token: process.env.TELEGRAM_TOKEN },
});

gw.on('message', async (msg) => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: msg.text }],
  });

  await msg.reply(completion.choices[0].message.content);
});

await gw.start();
console.log('OpenAI bot running on:', Object.keys(gw.health()).join(', '));
