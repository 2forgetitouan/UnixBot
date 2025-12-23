const { Client, GatewayIntentBits, Collection, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config.json');
const { isOwner } = require('./utils/isOwner');
const { isSuperuser } = require('./utils/isSuperuser');
const { log } = require('./utils/logger');
const noarchiveManager = require('./utils/noarchiveManager');
const pingCollector = require('./utils/pingCollector');

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

// Restaurer les auto-bumps au démarrage
client.once('clientReady', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  
  // Démarrer le collecteur de ping
  pingCollector.startCollector(client);
  
  // Restaurer les auto-bumps après un délai
  setTimeout(() => {
    try {
      const selfbumpCommand = client.commands.get('selfbump');
      if (selfbumpCommand && typeof selfbumpCommand.restoreAutoBumps === 'function') {
        console.log('🔄 Restauration des auto-bumps...');
        selfbumpCommand.restoreAutoBumps();
      }
    } catch (error) {
      console.error('❌ Erreur lors de la restauration des auto-bumps:', error);
    }
  }, 3000); // Attendre 3 secondes que le bot soit bien connecté
});

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

// Gestionnaire d'interactions pour les boutons de giveaway, menus et slash commands
client.on('interactionCreate', async interaction => {
  // Gestion de l'autocomplétion
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    
    if (interaction.commandName === 'help') {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const upcmdDir = path.join(__dirname, 'upcmd');
      const defaultcmdDir = path.join(__dirname, 'defaultcmd');
      
      const allCommands = [];
      
      function getCommandsFromDir(dir) {
        if (!fs.existsSync(dir)) return;
        const commandFolders = fs.readdirSync(dir);
        for (const folder of commandFolders) {
          const infoPath = path.join(dir, folder, 'infos.json');
          if (fs.existsSync(infoPath)) {
            try {
              const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
              allCommands.push({
                name: info.name,
                description: info.description || 'Pas de description'
              });
            } catch (e) {}
          }
        }
      }
      
      getCommandsFromDir(upcmdDir);
      getCommandsFromDir(defaultcmdDir);
      
      // Ajouter l'option "all"
      allCommands.unshift({ name: 'all', description: 'Afficher toutes les commandes' });
      
      // Filtrer selon ce que l'utilisateur tape (ignore les espaces dans la recherche)
      const searchTerm = focusedValue.replace(/\s+/g, '');
      const filtered = allCommands
        .filter(cmd => {
          if (!searchTerm) return true; // Si vide, afficher tout
          return cmd.name.toLowerCase().includes(searchTerm);
        })
        .slice(0, 25); // Discord limite à 25 suggestions
      
      await interaction.respond(
        filtered.map(cmd => ({
          name: `${cmd.name} - ${cmd.description}`,
          value: cmd.name
        }))
      );
    } else if (command && typeof command.autocomplete === 'function') {
      // Appeler la fonction autocomplete de la commande
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Erreur lors de l'autocomplétion de ${interaction.commandName}:`, error);
      }
    }
    return;
  }

  // Gestion des slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.executeSlash) {
      return interaction.reply({ content: '❌ Commande introuvable.', ephemeral: true });
    }

    const username = (interaction.user.discriminator === '0' || interaction.user.discriminator === '0000')
      ? interaction.user.username
      : `${interaction.user.username}#${interaction.user.discriminator}`;

    log('COMMAND', `Slash commande "/${interaction.commandName}" exécutée`, {
      user: username,
      channel: interaction.channel?.name || interaction.channelId
    });

    // Vérification permissions
    if (command.admin && !(isOwner(username) || isSuperuser(username))) {
      return interaction.reply({ content: 'Vous n\'êtes pas autorisé à utiliser cette commande.', ephemeral: true });
    }

    if (command.superuser && !isSuperuser(username)) {
      return interaction.reply({ content: 'Vous n\'êtes pas autorisé à utiliser cette commande.', ephemeral: true });
    }

    try {
      await command.executeSlash(interaction);
      log('SUCCESS', `Slash commande "/${interaction.commandName}" terminée`, {
        user: username,
        channel: interaction.channel?.name || interaction.channelId
      });
    } catch (error) {
      log('ERROR', `Erreur sur "/${interaction.commandName}": ${error.message}`, {
        user: username,
        channel: interaction.channel?.name || interaction.channelId
      });
      const reply = { content: 'Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
    return;
  }

  // Gestion du menu déroulant help
  if (interaction.isStringSelectMenu() && interaction.customId === 'help_category_select') {
    const selectedCategory = interaction.values[0];
    const config = require('./config/config.json');
    const upcmdDir = path.join(__dirname, 'upcmd');
    const defaultcmdDir = path.join(__dirname, 'defaultcmd');

    const { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');

    // Retour à l'accueil
    if (selectedCategory === 'home') {
      const embed = new EmbedBuilder()
        .setTitle('🤖 Bienvenue sur UnixBot')
        .setDescription('**UnixBot** est un bot Discord polyvalent avec de nombreuses fonctionnalités pour gérer votre serveur.')
        .setColor('#7c3aed')
        .addFields(
          { 
            name: '📚 Comment utiliser l\'aide', 
            value: '• `/help <commande>` - Voir les détails d\'une commande\n• `/help all` - Afficher toutes les commandes\n• Utilisez le menu déroulant ci-dessous pour naviguer par catégorie',
            inline: false 
          },
          { 
            name: '✨ Fonctionnalités principales', 
            value: '• Gestion des commandes (activer/désactiver)\n• Giveaways interactifs\n• Gestion des threads et archives\n• Modération et utilitaires\n• Interface web d\'administration',
            inline: false 
          },
          {
            name: '🎨 Thème',
            value: 'Violet sombre • Design moderne',
            inline: true
          },
          {
            name: '📊 Version',
            value: '1.2.0',
            inline: true
          }
        )
        .setFooter({ text: 'UnixBot • Sélectionnez une catégorie pour commencer' })
        .setTimestamp();

      const categories = new Map();
      const alreadyAdded = new Set();

      function addCommandsFromDir(dir) {
        if (!fs.existsSync(dir)) return;
        const commandFolders = fs.readdirSync(dir);
        for (const folder of commandFolders) {
          const infoPath = path.join(dir, folder, 'infos.json');
          if (fs.existsSync(infoPath)) {
            try {
              const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
              if (alreadyAdded.has(info.name)) return;
              alreadyAdded.add(info.name);
              if (!categories.has(info.category)) {
                categories.set(info.category, []);
              }
              categories.get(info.category).push({ name: info.name, description: info.description });
            } catch (e) {}
          }
        }
      }

      addCommandsFromDir(upcmdDir);
      addCommandsFromDir(defaultcmdDir);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('📋 Sélectionnez une catégorie')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('🏠 Accueil')
            .setDescription('Retour à la page d\'accueil')
            .setValue('home'),
          new StringSelectMenuOptionBuilder()
            .setLabel('📋 Toutes les commandes')
            .setDescription('Afficher toutes les commandes')
            .setValue('all'),
          ...Array.from(categories.keys()).map(category => 
            new StringSelectMenuOptionBuilder()
              .setLabel(category)
              .setDescription(`Commandes de la catégorie ${category}`)
              .setValue(category)
          )
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }

    const categories = new Map();
    const alreadyAdded = new Set();

    function addCommandsFromDir(dir) {
      if (!fs.existsSync(dir)) return;
      const commandFolders = fs.readdirSync(dir);
      for (const folder of commandFolders) {
        const infoPath = path.join(dir, folder, 'infos.json');
        if (fs.existsSync(infoPath)) {
          try {
            const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
            if (alreadyAdded.has(info.name)) return;
            alreadyAdded.add(info.name);
            if (!categories.has(info.category)) {
              categories.set(info.category, []);
            }
            categories.get(info.category).push({
              name: info.name,
              description: info.description
            });
          } catch (e) {}
        }
      }
    }

    addCommandsFromDir(upcmdDir);
    addCommandsFromDir(defaultcmdDir);

    const embed = new EmbedBuilder()
      .setColor('#7c3aed');

    if (selectedCategory === 'all') {
      embed.setTitle('📚 Toutes les commandes')
        .setDescription('Utilisez `/help <commande>` pour voir les détails d\'une commande.');
      
      for (const [category, commands] of categories) {
        embed.addFields({
          name: `─ ${category} ─`,
          value: commands.map(cmd => `**/${cmd.name}** - ${cmd.description}`).join('\n'),
          inline: false
        });
      }
      embed.setFooter({ text: `UnixBot • ${alreadyAdded.size} commandes disponibles` });
    } else {
      const commands = categories.get(selectedCategory);
      if (commands) {
        embed.setTitle(`📚 Catégorie: ${selectedCategory}`)
          .setDescription('Utilisez `/help <commande>` pour voir les détails d\'une commande.')
          .addFields({
            name: `Commandes disponibles`,
            value: commands.map(cmd => `**/${cmd.name}** - ${cmd.description}`).join('\n'),
            inline: false
          })
          .setFooter({ text: `UnixBot • ${commands.length} commande(s)` });
      }
    }

    await interaction.update({ embeds: [embed] });
    return;
  }

  // Gestion des boutons
  if (!interaction.isButton()) return;

  // Gestion des boutons de bump
  if (interaction.customId === 'bump_disable') {
    const bumpstatsCommand = client.commands.get('bumpstats');
    if (bumpstatsCommand && typeof bumpstatsCommand.handleButton === 'function') {
      return bumpstatsCommand.handleButton(interaction);
    }
  }

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
  
  // Arrêter le collecteur de ping et marquer comme offline
  pingCollector.stopCollector();
  
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
