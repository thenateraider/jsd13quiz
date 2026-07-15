import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { handleInteraction } from './interactions.js';
import { startScheduler } from './scheduler.js';
import { assertValidData } from './validate-data.js';
import { db } from './database.js';

assertValidData();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  startScheduler(readyClient);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    await handleInteraction(interaction);
  } catch (error) {
    console.error(error);

    const message = 'เกิดข้อผิดพลาดระหว่างทำรายการ';
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(config.token);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    client.destroy();
    if (db.open) db.close();
    process.exit(0);
  });
}
