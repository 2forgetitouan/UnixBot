const { PermissionsBitField } = require('discord.js');
const manager = require('../../utils/noarchiveManager');

module.exports = {
  name: 'noarchive',
  description: 'Empêche les threads d\'un salon forum de s\'archiver',
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
        await message.reply('❌ L\'ID du salon forum est requis. Exemple : `+noarchive 123456789012345678`');
        return;
      }

      manager.protectForum(forumId);
      await message.reply(`✅ Les threads du forum **${forumId}** ne seront plus archivés (auto-unarchive actif).`);
    } catch (error) {
      console.error('Erreur commande noarchive:', error);
      await message.reply('❌ Erreur lors de la configuration noarchive.');
    }
  }
};
