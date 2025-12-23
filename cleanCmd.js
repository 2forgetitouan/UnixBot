const { REST, Routes } = require('discord.js');
const { token, clientId } = require('./config/config.json'); // récupère token et clientId depuis ton config.json
const guildId = '1407636136603684934';

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    // ----- COMMANDES GLOBALES -----
    console.log('Récupération des commandes globales...');
    const globalCommands = await rest.get(Routes.applicationCommands(clientId));
    
    if (globalCommands.length === 0) {
      console.log('Pas de commandes globales à supprimer.');
    } else {
      console.log(`Suppression de ${globalCommands.length} commandes globales...`);
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      globalCommands.forEach(cmd => console.log(`Supprimée : ${cmd.name} (ID : ${cmd.id})`));
    }

    // ----- COMMANDES DU SERVEUR -----
    console.log('\nRécupération des commandes du serveur...');
    const guildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
    
    if (guildCommands.length === 0) {
      console.log('Pas de commandes du serveur à supprimer.');
    } else {
      console.log(`Suppression de ${guildCommands.length} commandes du serveur...`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      guildCommands.forEach(cmd => console.log(`Supprimée : ${cmd.name} (ID : ${cmd.id})`));
    }

    console.log('\nTout est supprimé !');

  } catch (error) {
    console.error(error);
  }
})();
