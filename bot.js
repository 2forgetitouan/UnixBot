const { Client, GatewayIntentBits, Collection, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config.json');
const { isOwner } = require('./utils/isOwner');
const { isSuperuser } = require('./utils/isSuperuser');
const { log } = require('./utils/logger');
const noarchiveManager = require('./utils/noarchiveManager');

// Threads en cours de restauration pour éviter les boucles
const restoringThreads = new Set();

async function reopenThread(thread, reason = 'Auto désarchivage') {
  const id = thread?.id;
  if (!id) return;
  if (restoringThreads.has(id)) return;

  restoringThreads.add(id);
  try {
    const me = thread.guild?.members?.me || await thread.guild?.members?.fetchMe?.();
    if (!me) {
      console.warn('Auto-unarchive: bot introuvable dans la guilde.');
      return;
    }
    const perms = thread.permissionsFor(me);
    if (!perms?.has(PermissionsBitField.Flags.ManageThreads)) {
      console.warn(`Auto-unarchive: permission ManageThreads manquante sur le thread ${id}.`);
      return;
    }

    try {
      if (thread.locked) {
        await thread.setLocked(false, 'Auto déverrouillage');
      }
    } catch (e) {
      console.warn('Auto-unarchive: impossible de déverrouiller le thread', e?.code || e?.message || e);
    }

    try {
      if (thread.archived) {
        await thread.setArchived(false, reason);
      }
    } catch (e) {
      console.warn('Auto-unarchive: impossible de désarchiver', e?.code || e?.message || e);
    }

    try {
      if (typeof thread.setAutoArchiveDuration === 'function' && thread.autoArchiveDuration && thread.autoArchiveDuration < 10080) {
        await thread.setAutoArchiveDuration(10080, 'Max auto-archive');
      }
    } catch (e) {
      console.warn('Auto-unarchive: impossible de définir autoArchiveDuration', e?.code || e?.message || e);
    }
  } finally {
    restoringThreads.delete(id);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// Fonction pour recharger les commandes
function loadCommands(client) {
  const commandFolders = [
    path.join(__dirname, 'defaultcmd'),
    path.join(__dirname, 'upcmd')
  ];
  client.commands.clear();

  for (const folder of commandFolders) {
    if (fs.existsSync(folder)) {
      const commandFiles = fs.readdirSync(folder);
      for (const file of commandFiles) {
        const commandPath = path.join(folder, file, `${file}.js`);
        const infosPath = path.join(folder, file, 'infos.json');
        if (fs.existsSync(commandPath)) {
          delete require.cache[require.resolve(commandPath)];
          const command = require(commandPath);

          // Ajoute la propriété admin/superuser depuis infos.json si elle existe
          if (fs.existsSync(infosPath)) {
            try {
              const infos = JSON.parse(fs.readFileSync(infosPath, 'utf8'));
              if (infos.admin) command.admin = true;
              if (infos.superuser) command.superuser = true;
              command.infos = infos;
            } catch {}
          }

          client.commands.set(command.name, command);
        }
      }
    }
  }
}

// Charger les commandes au démarrage
loadCommands(client);

// Écoute un événement personnalisé pour recharger les commandes
client.on('commandsUpdated', () => {
  loadCommands(client);
  console.log('Commandes rechargées.');
});

// Vérifie périodiquement le flag de rechargement
setInterval(() => {
  const flagPath = path.join(__dirname, 'config/reload_flag');
  if (fs.existsSync(flagPath)) {
    fs.unlinkSync(flagPath);
    client.emit('commandsUpdated');
  }
}, 2000); // Vérifie toutes les 2 secondes

// Écouter les messages avec préfixe
client.on('messageCreate', async message => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  const author = message.author;
  const username = (author.discriminator === '0' || author.discriminator === '0000')
    ? author.username
    : `${author.username}#${author.discriminator}`;

  // Log la tentative d'exécution de commande
  log('COMMAND', `Commande "${commandName}" exécutée`, {
    user: username,
    channel: message.channel?.name || message.channelId,
    content: message.content
  });

  // Vérification automatique pour les commandes admin
  if (command.admin && !(isOwner(username) || isSuperuser(username))) {
    return message.reply('Vous n\'êtes pas autorisé à utiliser cette commande.');
  }

  // Vérification automatique pour les commandes superuser
  if (command.superuser && !isSuperuser(username)) {
    return message.reply('Vous n\'êtes pas autorisé à utiliser cette commande.');
  }

  try {
    await command.execute(message, args, client);
    log('SUCCESS', `Commande "${commandName}" terminée`, {
      user: username,
      channel: message.channel?.name || message.channelId
    });
  } catch (error) {
    log('ERROR', `Erreur sur "${commandName}": ${error.message}`, {
      user: username,
      channel: message.channel?.name || message.channelId
    });
    await message.reply('Une erreur est survenue lors de l\'exécution de cette commande.');
  }
});

// Gestionnaire d'interactions pour les boutons de giveaway
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  // Gestion des boutons de giveaway
  if (interaction.customId.startsWith('giveaway_join_')) {
    try {
      const fs = require('fs');
      const giveawayPath = path.join(__dirname, 'config/giveaways.json');
      
      if (!fs.existsSync(giveawayPath)) {
        return interaction.reply({ content: '❌ Giveaway introuvable.', ephemeral: true });
      }

      let data = JSON.parse(fs.readFileSync(giveawayPath, 'utf8'));
      const giveawayIndex = data.active.findIndex(g => g.messageId === interaction.message.id);

      if (giveawayIndex === -1) {
        return interaction.reply({ content: '❌ Ce giveaway n\'existe plus.', ephemeral: true });
      }

      const giveaway = data.active[giveawayIndex];

      if (giveaway.ended) {
        return interaction.reply({ content: '❌ Ce giveaway est terminé.', ephemeral: true });
      }

      // Initialiser participants si undefined
      if (!giveaway.participants) {
        giveaway.participants = [];
      }

      // Vérifier si l'utilisateur participe déjà
      if (giveaway.participants.includes(interaction.user.id)) {
        // Retirer la participation
        giveaway.participants = giveaway.participants.filter(id => id !== interaction.user.id);
        
        // Mettre à jour dans le tableau
        data.active[giveawayIndex] = giveaway;
        fs.writeFileSync(giveawayPath, JSON.stringify(data, null, 2));

        // Mettre à jour l'embed
        const giveawayModule = require('./upcmd/giveaway/giveaway.js');
        await giveawayModule.updateGiveawayEmbed(giveaway, client);

        return interaction.reply({ 
          content: '❌ Vous ne participez plus au giveaway.', 
          ephemeral: true 
        });
      } else {
        // Ajouter la participation
        giveaway.participants.push(interaction.user.id);
        
        // Mettre à jour dans le tableau
        data.active[giveawayIndex] = giveaway;
        fs.writeFileSync(giveawayPath, JSON.stringify(data, null, 2));

        // Mettre à jour l'embed immédiatement
        const giveawayModule = require('./upcmd/giveaway/giveaway.js');
        await giveawayModule.updateGiveawayEmbed(giveaway, client);

        return interaction.reply({ 
          content: '✅ Vous participez maintenant au giveaway ! Bonne chance ! 🍀', 
          ephemeral: true 
        });
      }
    } catch (error) {
      console.error('Erreur interaction giveaway:', error);
      return interaction.reply({ 
        content: '❌ Une erreur est survenue.', 
        ephemeral: true 
      });
    }
  }
});

// Auto-unarchive des threads/forums
client.on('threadUpdate', async (oldThread, newThread) => {
  try {
    if (!newThread?.archived) return;
    const parentId = newThread.parentId;
    if (!parentId) return;

    if (!noarchiveManager.shouldAutoUnarchive() && !noarchiveManager.isForumProtected(parentId)) {
      return;
    }

    await reopenThread(newThread, 'Auto désarchivage');
  } catch (err) {
    console.error('Erreur auto-unarchive (threadUpdate):', err);
  }
});

client.on('threadCreate', async thread => {
  try {
    const parentId = thread.parentId;
    if (!parentId) return;

    if (!noarchiveManager.shouldAutoUnarchive() && !noarchiveManager.isForumProtected(parentId)) {
      return;
    }

    await reopenThread(thread, 'Auto désarchivage (creation)');
  } catch (err) {
    console.error('Erreur auto-unarchive (threadCreate):', err);
  }
});

// Variables pour gérer l'état du bot
let botStatus = 'stopped';

function startBot() {
  if (botStatus === 'running') {
    console.log('Le bot est déjà en cours d\'exécution.');
    return Promise.resolve();
  }
  botStatus = 'running';
  log('INFO', 'Démarrage du bot Discord...');
  return client.login(config.token).then(() => {
    log('SUCCESS', 'Bot Discord connecté avec succès');
  }).catch(err => {
    botStatus = 'stopped';
    log('ERROR', `Erreur de connexion: ${err.message}`);
    throw err;
  });
}

function stopBot() {
  if (botStatus === 'stopped') {
    console.log('Le bot est déjà arrêté.');
    return Promise.resolve();
  }
  botStatus = 'stopped';
  log('INFO', 'Arrêt du bot Discord...');
  client.destroy();
  log('SUCCESS', 'Bot Discord déconnecté');
  return Promise.resolve();
}

function restartBot() {
  log('INFO', 'Redémarrage du bot Discord...');
  return stopBot().then(() => {
    // Recharger les commandes
    loadCommands(client);
    return new Promise(resolve => setTimeout(resolve, 1000));
  }).then(() => startBot());
}

function getBotStatus() {
  return botStatus;
}

// Démarrage automatique du bot
startBot();

// Exporter les fonctions de contrôle
module.exports = {
  client,
  startBot,
  stopBot,
  restartBot,
  getBotStatus
};
