<<<<<<< HEAD
const { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, SlashCommandBuilder } = require('discord.js');
=======
const { EmbedBuilder } = require('discord.js');
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'help',
  description: 'Affiche la liste des commandes disponibles.',
  category: 'infos',
  options: [],
<<<<<<< HEAD
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes disponibles')
    .addStringOption(option =>
      option.setName('commande')
        .setDescription('Nom de la commande pour voir les détails')
        .setAutocomplete(true)
        .setRequired(false)),
  
  executeSlash: async (interaction) => {
    const commandName = interaction.options.getString('commande');
    const config = require('../../config/config.json');
    
    if (commandName && commandName.toLowerCase() === 'all') {
      return await showAllCommands(interaction, config, true);
    }
    
    if (commandName) {
      return await showCommandDetails(interaction, commandName, config, true);
    }
    
    return await showWelcome(interaction, config, true);
  },

=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
  execute: async (message, args, client) => {
    const config = require('../../config/config.json');
    const upcmdDir = path.join(__dirname, '../../upcmd');
    const defaultcmdDir = path.join(__dirname, '../../defaultcmd');
    
    // Si un argument est fourni, afficher l'aide détaillée pour cette commande
    if (args.length > 0) {
<<<<<<< HEAD
      if (args[0].toLowerCase() === 'all') {
        return await showAllCommands(message, config, false);
      }
      return await showCommandDetails(message, args[0], config, false);
    }

    // Sinon, afficher l'accueil
    return await showWelcome(message, config, false);
  }
};

// Fonction pour afficher l'accueil
async function showWelcome(target, config, isSlash) {
  const embed = new EmbedBuilder()
    .setTitle('Bienvenue sur UnixBot')
    .setDescription('**UnixBot** est un bot Discord polyvalent avec de nombreuses fonctionnalités pour gérer votre serveur.')
    .setColor('#7c3aed')
    .setThumbnail('https://cdn.discordapp.com/emojis/1451969411299934375.png?size=128')
    .setImage('https://raw.githubusercontent.com/2forgetitouan/Wallpaper-Images/main/banniere3.gif')
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
        name: '🖥️ Panel',
        value: '*Bientôt disponible* [Accéder au panel d\'administration](http://unixbot.deforge.me)',
        inline: true
      },
      {
        name: '📊 Version',
        value: '3.1.0 *beta*',
        inline: true
      }
    )
    .setFooter({ text: 'UnixBot • Sélectionnez une catégorie pour commencer' })
    .setTimestamp();

  const upcmdDir = path.join(__dirname, '../../upcmd');
  const defaultcmdDir = path.join(__dirname, '../../defaultcmd');
  
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

  return isSlash 
    ? target.reply({ embeds: [embed], components: [row] })
    : target.reply({ embeds: [embed], components: [row] });
}

// Fonction pour afficher les détails d'une commande
async function showCommandDetails(target, commandName, config, isSlash) {
  const upcmdDir = path.join(__dirname, '../../upcmd');
  const defaultcmdDir = path.join(__dirname, '../../defaultcmd');
  
  commandName = commandName.toLowerCase();
  let commandInfo = null;

  // Rechercher dans upcmd
  const upcmdPath = path.join(upcmdDir, commandName, 'infos.json');
  if (fs.existsSync(upcmdPath)) {
    commandInfo = JSON.parse(fs.readFileSync(upcmdPath, 'utf8'));
  }

  // Rechercher dans defaultcmd si non trouvé
  if (!commandInfo) {
    const defaultcmdPath = path.join(defaultcmdDir, commandName, 'infos.json');
    if (fs.existsSync(defaultcmdPath)) {
      commandInfo = JSON.parse(fs.readFileSync(defaultcmdPath, 'utf8'));
    }
  }

  if (!commandInfo) {
    const msg = `❌ Commande \`${commandName}\` introuvable. Utilisez \`/help\` pour voir toutes les commandes.`;
    return isSlash ? target.reply({ content: msg, ephemeral: true }) : target.reply(msg);
  }

  // Créer l'embed détaillé
  const detailEmbed = new EmbedBuilder()
    .setTitle(`📖 Aide : /${commandInfo.name}`)
    .setDescription(commandInfo.description)
    .setColor('#7c3aed');

  // Usage
  if (commandInfo.usage) {
    detailEmbed.addFields({ 
      name: '📝 Utilisation', 
      value: `\`${commandInfo.usage}\``,
      inline: false 
    });
  }

  // Exemples
  if (commandInfo.examples && commandInfo.examples.length > 0) {
    detailEmbed.addFields({ 
      name: '💡 Exemples', 
      value: commandInfo.examples.map(ex => `\`${ex}\``).join('\n'),
      inline: false 
    });
  }

  // Permissions
  const permissions = [];
  if (commandInfo.admin) permissions.push('Administrateur');
  if (commandInfo.superuser) permissions.push('Superuser');
  if (permissions.length > 0) {
    detailEmbed.addFields({ 
      name: '🛡️ Permissions', 
      value: permissions.join('\n'),
      inline: false 
    });
  }

  // Détails
  if (commandInfo.details) {
    detailEmbed.addFields({ 
      name: 'ℹ️ Détails', 
      value: commandInfo.details,
      inline: false 
    });
  }

  detailEmbed.setFooter({ text: `Catégorie: ${commandInfo.category}` });

  return isSlash ? target.reply({ embeds: [detailEmbed] }) : target.reply({ embeds: [detailEmbed] });
}

// Fonction pour afficher toutes les commandes
async function showAllCommands(target, config, isSlash) {
  const upcmdDir = path.join(__dirname, '../../upcmd');
  const defaultcmdDir = path.join(__dirname, '../../defaultcmd');
  
  const categories = new Map();
  const alreadyAdded = new Set();

  // Fonction utilitaire pour ajouter les commandes d'un dossier
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

  // Ajoute les commandes actives (upcmd et defaultcmd)
  addCommandsFromDir(upcmdDir);
  addCommandsFromDir(defaultcmdDir);

  // Créer l'embed principal
  const embed = new EmbedBuilder()
    .setTitle('📚 Toutes les commandes')
    .setDescription('Utilisez `/help <commande>` pour voir les détails d\'une commande.')
    .setColor('#7c3aed');

  // Affiche toutes les catégories
  for (const [category, commands] of categories) {
    embed.addFields({
      name: `─ ${category} ─`,
      value: commands.map(cmd => `**/${cmd.name}** - ${cmd.description}`).join('\n'),
      inline: false
    });
  }

  embed.setFooter({ text: `UnixBot • ${alreadyAdded.size} commandes disponibles` });

  // Créer le menu déroulant avec les catégories
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('📋 Filtrer par catégorie')
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

  return isSlash 
    ? target.reply({ embeds: [embed], components: [row] })
    : target.reply({ embeds: [embed], components: [row] });
}
=======
      const commandName = args[0].toLowerCase();
      let commandInfo = null;
      let commandPath = null;

      // Rechercher dans upcmd
      const upcmdPath = path.join(upcmdDir, commandName, 'infos.json');
      if (fs.existsSync(upcmdPath)) {
        commandInfo = JSON.parse(fs.readFileSync(upcmdPath, 'utf8'));
        commandPath = upcmdPath;
      }

      // Rechercher dans defaultcmd si non trouvé
      if (!commandInfo) {
        const defaultcmdPath = path.join(defaultcmdDir, commandName, 'infos.json');
        if (fs.existsSync(defaultcmdPath)) {
          commandInfo = JSON.parse(fs.readFileSync(defaultcmdPath, 'utf8'));
          commandPath = defaultcmdPath;
        }
      }

      if (!commandInfo) {
        return message.reply(`❌ Commande \`${commandName}\` introuvable. Utilisez \`${config.prefix}help\` pour voir toutes les commandes.`);
      }

      // Créer l'embed détaillé
      const detailEmbed = new EmbedBuilder()
        .setTitle(`📖 Aide : ${config.prefix}${commandInfo.name}`)
        .setDescription(commandInfo.description)
        .setColor('#5865F2');

      // Usage
      if (commandInfo.usage) {
        detailEmbed.addFields({ 
          name: '📝 Utilisation', 
          value: `\`${commandInfo.usage}\``,
          inline: false 
        });
      }

      // Exemples
      if (commandInfo.examples && commandInfo.examples.length > 0) {
        detailEmbed.addFields({ 
          name: '💡 Exemples', 
          value: commandInfo.examples.map(ex => `\`${ex}\``).join('\n'),
          inline: false 
        });
      }

      // Permissions (déduites de admin/superuser)
      const permissions = [];
      if (commandInfo.admin) permissions.push('Administrateur');
      if (commandInfo.superuser) permissions.push('Superuser');
      if (permissions.length > 0) {
        detailEmbed.addFields({ 
          name: '🛡️ Permissions', 
          value: permissions.join('\n'),
          inline: false 
        });
      }

      // Détails
      if (commandInfo.details) {
        detailEmbed.addFields({ 
          name: 'ℹ️ Détails', 
          value: commandInfo.details,
          inline: false 
        });
      }

      detailEmbed.setFooter({ text: `Catégorie: ${commandInfo.category}` });

      return message.reply({ embeds: [detailEmbed] });
    }

    // Sinon, afficher la liste complète des commandes
    const categories = new Map();
    const alreadyAdded = new Set();

    // Fonction utilitaire pour ajouter les commandes d'un dossier
    function addCommandsFromDir(dir) {
      if (!fs.existsSync(dir)) return;
      const commandFolders = fs.readdirSync(dir);
      for (const folder of commandFolders) {
        const infoPath = path.join(dir, folder, 'infos.json');
        if (fs.existsSync(infoPath)) {
          try {
            const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
            if (alreadyAdded.has(info.name)) continue; // Évite les doublons
            alreadyAdded.add(info.name);
            if (!categories.has(info.category)) {
              categories.set(info.category, []);
            }
            categories.get(info.category).push({
              name: info.name,
              description: info.description
            });
          } catch (e) {
            // Ignore les erreurs de parsing
          }
        }
      }
    }

    // Ajoute les commandes actives (upcmd et defaultcmd)
    addCommandsFromDir(upcmdDir);
    addCommandsFromDir(defaultcmdDir);

    // Créer l'embed
    const embed = new EmbedBuilder()
      .setTitle('📚 Liste des commandes disponibles')
      .setDescription(`Utilisez \`${config.prefix}help [commande]\` pour plus de détails sur une commande spécifique.`)
      .setColor('#0099ff');

    for (const [category, commands] of categories) {
      embed.addFields({
        name: `─ ${category} ─`,
        value: commands.map(cmd => `**${config.prefix}${cmd.name}**: ${cmd.description}`).join('\n'),
        inline: false
      });
    }

    // Affiche le message
    await message.reply({ embeds: [embed] });
  }
};
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
