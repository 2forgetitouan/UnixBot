const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config.json');

const commands = [];
const commandFolders = [
  path.join(__dirname, 'defaultcmd'),
  path.join(__dirname, 'upcmd')
];

for (const folder of commandFolders) {
  if (fs.existsSync(folder)) {
    const commandFiles = fs.readdirSync(folder);
    for (const file of commandFiles) {
      const commandPath = path.join(folder, file, `${file}.js`);
      if (fs.existsSync(commandPath)) {
        const command = require(commandPath);
        commands.push({
          name: command.name,
          description: command.description || 'Pas de description',
          options: command.options || [],
        });
      }
    }
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('Suppression des anciennes commandes slash...');
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: [] }
    );
    console.log('Anciennes commandes supprimées.');

    console.log('Déploiement des nouvelles commandes slash...');
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );

    console.log('Commandes slash enregistrées avec succès :');
    commands.forEach(cmd => console.log(`- ${cmd.name}: ${cmd.description}`));

  } catch (error) {
    console.error(error);
  }
})();
