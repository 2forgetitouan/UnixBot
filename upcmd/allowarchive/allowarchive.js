const { PermissionsBitField } = require('discord.js');
const manager = require('../../utils/noarchiveManager');

module.exports = {
  name: 'allowarchive',
  description: 'Réautorise l\'archivage des threads pour un salon forum',
  category: 'moderation',
  options: [],

  execute: async (message, args, client) => {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.reply('❌ Permission requise : Gérer les salons.');
        return;
      }

      const forumId = args[0];
      if (!forumId) {
        await message.reply('❌ Fournis l\'ID du salon forum. Exemple : `+allowarchive 123456789012345678`');
        return;
      }

      manager.allowArchive(forumId);
      await message.reply(`✅ Les threads du forum **${forumId}** peuvent à nouveau s'archiver.`);
    } catch (error) {
      console.error('Erreur commande allowarchive:', error);
      await message.reply('❌ Erreur lors de la configuration allowarchive.');
    }
  }
};
