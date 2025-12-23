const config = require('./config/config.json');
const { REST, Routes } = require('discord.js');
const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    const cmds = await rest.get(Routes.applicationCommands(config.clientId));
    console.log('\n✅ Commandes slash enregistrées sur Discord:');
    cmds.forEach(c => console.log(`  /${c.name}: ${c.description}`));
    console.log(`\nTotal: ${cmds.length} commandes\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
