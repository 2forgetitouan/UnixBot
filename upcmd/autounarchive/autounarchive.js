<<<<<<< HEAD
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
=======
const { PermissionsBitField } = require('discord.js');
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
const manager = require('../../utils/noarchiveManager');

module.exports = {
  name: 'autounarchive',
  description: 'Active ou désactive le réouverture auto de tous les threads du serveur',
  category: 'moderation',
<<<<<<< HEAD
  data: new SlashCommandBuilder()
    .setName('autounarchive')
    .setDescription('Active ou désactive le réouverture auto de tous les threads du serveur')
    .addStringOption(option =>
      option.setName('etat')
        .setDescription('Activer ou désactiver')
        .setRequired(true)
        .addChoices(
          { name: 'Activer', value: 'on' },
          { name: 'Désactiver', value: 'off' }
        )
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
<<<<<<< HEAD
  },
  executeSlash: async (interaction) => {
    try {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: '❌ Permission requise : Gérer les salons.', ephemeral: true });
      }

      const choice = interaction.options.getString('etat');
      const enabled = choice === 'on';
      manager.setAutoUnarchive(enabled);

      await interaction.reply({ content: `✅ Auto-unarchive global ${enabled ? 'activé' : 'désactivé'}.`, ephemeral: true });
    } catch (error) {
      console.error('Erreur commande autounarchive:', error);
      await interaction.reply({ content: '❌ Erreur lors du paramétrage autounarchive.', ephemeral: true });
    }
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
  }
};
