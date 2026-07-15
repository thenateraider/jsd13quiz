import 'dotenv/config';

const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'QUIZ_CHANNEL_ID'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key} in .env`);
  }
}

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  quizChannelId: process.env.QUIZ_CHANNEL_ID,
  adminRoleId: process.env.ADMIN_ROLE_ID || null,
  timezone: process.env.TIMEZONE || 'Asia/Bangkok',
};
