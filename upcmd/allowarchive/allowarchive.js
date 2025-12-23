<<<<<<< HEAD
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
=======
const { PermissionsBitField } = require('discord.js');
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
const manager = require('../../utils/noarchiveManager');

module.exports = {
  name: 'allowarchive',
  description: 'Réautorise l\'archivage des threads pour un salon forum',
  category: 'moderation',
<<<<<<< HEAD
  data: new SlashCommandBuilder()
    .setName('allowarchive')
    .setDescription('Réautorise l\'archivage des threads pour un salon forum')
    .addStringOption(option =>
      option.setName('forum_id')
        .setDescription('ID du salon forum')
        .setRequired(true)
    ),
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
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
<<<<<<< HEAD
  },
  executeSlash: async (interaction) => {
    try {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: '❌ Permission requise : Gérer les salons.', ephemeral: true });
      }

      const forumId = interaction.options.getString('forum_id');
      if (!forumId) {
        return interaction.reply({ content: '❌ Fournis l\'ID du salon forum.', ephemeral: true });
      }

      manager.allowArchive(forumId);
      await interaction.reply({ content: `✅ Les threads du forum **${forumId}** peuvent à nouveau s'archiver.`, ephemeral: true });
    } catch (error) {
      console.error('Erreur commande allowarchive:', error);
      await interaction.reply({ content: '❌ Erreur lors de la configuration allowarchive.', ephemeral: true });
    }
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
  }
};
