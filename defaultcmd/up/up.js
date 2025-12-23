<<<<<<< HEAD
const { SlashCommandBuilder } = require('discord.js');
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'up',
  description: 'Active une commande en la déplaçant dans le dossier "upcmd".',
  category: 'admin',
<<<<<<< HEAD
  data: new SlashCommandBuilder()
    .setName('up')
    .setDescription('Active une commande en la déplaçant dans le dossier "upcmd"')
    .addStringOption(option =>
      option.setName('commande')
        .setDescription('Nom de la commande à activer')
        .setRequired(true)
    ),
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
  options: [
    {
      name: 'commande',
      description: 'Nom de la commande à activer',
      type: 3, // STRING
      required: true
    }
  ],
<<<<<<< HEAD
  execute: async (message, args, client) => {
=======
  execute: async (interaction, args, client) => {
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
    const commandName = args[0];
    const baseDir = path.join(__dirname, '../../');
    const fromDir = path.join(baseDir, 'downcmd', commandName);
    const toDir = path.join(baseDir, 'upcmd', commandName);

    try {
      if (!fs.existsSync(fromDir)) {
        if (fs.existsSync(path.join(baseDir, 'upcmd', commandName))) {
          return interaction.reply({ content: `La commande "${commandName}" est déjà active.`, ephemeral: true });
        }
        if (fs.existsSync(path.join(baseDir, 'defaultcmd', commandName))) {
          return interaction.reply({ content: `La commande "${commandName}" est une commande par défaut et est toujours active.`, ephemeral: true });
        }
        return interaction.reply({ content: `La commande "${commandName}" n'existe pas dans les commandes inactives.`, ephemeral: true });
      }
      if (fs.existsSync(toDir)) {
        return interaction.reply({ content: `La commande "${commandName}" est déjà active.`, ephemeral: true });
      }
      fs.renameSync(fromDir, toDir);
      fs.writeFileSync(path.join(baseDir, 'config/reload_flag'), 'reload');
<<<<<<< HEAD
      message.reply(`La commande "${commandName}" a été activée avec succès !`);
    } catch (error) {
      console.error('Erreur lors de l\'activation de la commande :', error);
      message.reply(`Une erreur est survenue lors de l'activation de la commande "${commandName}".`);
    }
  },
  executeSlash: async (interaction) => {
    const commandName = interaction.options.getString('commande');
    const baseDir = path.join(__dirname, '../../');
    const fromDir = path.join(baseDir, 'downcmd', commandName);
    const toDir = path.join(baseDir, 'upcmd', commandName);

    try {
      if (!fs.existsSync(fromDir)) {
        if (fs.existsSync(path.join(baseDir, 'upcmd', commandName))) {
          return interaction.reply({ content: `La commande "${commandName}" est déjà active.`, ephemeral: true });
        }
        if (fs.existsSync(path.join(baseDir, 'defaultcmd', commandName))) {
          return interaction.reply({ content: `La commande "${commandName}" est une commande par défaut et est toujours active.`, ephemeral: true });
        }
        return interaction.reply({ content: `La commande "${commandName}" n'existe pas dans les commandes inactives.`, ephemeral: true });
      }
      if (fs.existsSync(toDir)) {
        return interaction.reply({ content: `La commande "${commandName}" est déjà active.`, ephemeral: true });
      }
      fs.renameSync(fromDir, toDir);
      fs.writeFileSync(path.join(baseDir, 'config/reload_flag'), 'reload');
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
      interaction.reply({ content: `La commande "${commandName}" a été activée avec succès !`, ephemeral: true });
    } catch (error) {
      console.error('Erreur lors de l\'activation de la commande :', error);
      interaction.reply({ content: `Une erreur est survenue lors de l'activation de la commande "${commandName}".`, ephemeral: true });
    }
  }
};
