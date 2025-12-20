const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'help',
  description: 'Affiche la liste des commandes disponibles.',
  category: 'infos',
  options: [],
  execute: async (message, args, client) => {
    const config = require('../../config/config.json');
    const upcmdDir = path.join(__dirname, '../../upcmd');
    const defaultcmdDir = path.join(__dirname, '../../defaultcmd');
    
    // Si un argument est fourni, afficher l'aide détaillée pour cette commande
    if (args.length > 0) {
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
