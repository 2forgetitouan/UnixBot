const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const manager = require('../../utils/noarchiveManager');

module.exports = {
  name: 'noarchive',
  description: 'Empêche les threads d\'un salon forum de s\'archiver',
  category: 'moderation',
  data: new SlashCommandBuilder()
    .setName('noarchive')
    .setDescription('Empêche les threads d\'un salon forum de s\'archiver')
    .addStringOption(option =>
      option.setName('forum_id')
        .setDescription('ID du salon forum')
        .setRequired(true)
    ),
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
  },
  executeSlash: async (interaction) => {
    try {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: '❌ Permission requise : Gérer les salons.', ephemeral: true });
      }

      const forumId = interaction.options.getString('forum_id');
      if (!forumId) {
        return interaction.reply({ content: '❌ L\'ID du salon forum est requis.', ephemeral: true });
      }

      manager.protectForum(forumId);
      await interaction.reply({ content: `✅ Les threads du forum **${forumId}** ne seront plus archivés (auto-unarchive actif).`, ephemeral: true });
    } catch (error) {
      console.error('Erreur commande noarchive:', error);
      await interaction.reply({ content: '❌ Erreur lors de la configuration noarchive.', ephemeral: true });
    }
  }
};
