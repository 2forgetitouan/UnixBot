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
        try {
          const command = require(commandPath);
          if (command.data) {
            commands.push(command.data.toJSON());
            console.log(`✅ Commande slash chargée: ${command.name}`);
          } else {
            console.log(`⚠️  Commande sans data slash: ${command.name}`);
          }
        } catch (error) {
          console.error(`❌ Erreur chargement ${file}:`, error.message);
        }
      }
    }
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('\n🗑️  Suppression des anciennes commandes slash...');
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: [] }
    );
    console.log('✅ Anciennes commandes supprimées.');

    console.log('\n📤 Déploiement des nouvelles commandes slash...');
    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );

    console.log(`\n✅ ${data.length} commandes slash enregistrées avec succès :`);
    data.forEach(cmd => console.log(`   /${cmd.name}: ${cmd.description}`));
    
    // Forcer la sortie du processus après l'enregistrement
    console.log('\n🎉 Enregistrement terminé!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
})();
