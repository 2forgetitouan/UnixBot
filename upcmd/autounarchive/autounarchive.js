const { PermissionsBitField } = require('discord.js');
const manager = require('../../utils/noarchiveManager');

module.exports = {
  name: 'autounarchive',
  description: 'Active ou désactive le réouverture auto de tous les threads du serveur',
  category: 'moderation',
  options: [],

  execute: async (message, args, client) => {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        await message.reply('❌ Permission requise : Gérer les salons.');
        return;
      }

      const choice = (args[0] || '').toLowerCase();
      if (!['on', 'off', 'true', 'false', '1', '0'].includes(choice)) {
        await message.reply('❌ Utilisation : `+autounarchive on` ou `+autounarchive off`.');
        return;
      }

      const enabled = ['on', 'true', '1'].includes(choice);
      manager.setAutoUnarchive(enabled);

      await message.reply(`✅ Auto-unarchive global ${enabled ? 'activé' : 'désactivé'}.`);
    } catch (error) {
      console.error('Erreur commande autounarchive:', error);
      await message.reply('❌ Erreur lors du paramétrage autounarchive.');
    }
  }
};
