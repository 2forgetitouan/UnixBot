<<<<<<< HEAD
const { SlashCommandBuilder } = require('discord.js');
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
const { removeOwner, getOwners } = require('../../utils/isOwner');

function getUsernameTag(user) {
  if (user.discriminator === '0' || user.discriminator === '0000') {
    return user.username;
  }
  return `${user.username}#${user.discriminator}`;
}

module.exports = {
  name: 'unowner',
  description: 'Retire un utilisateur de la liste owners.',
  category: 'admin',
<<<<<<< HEAD
  data: new SlashCommandBuilder()
    .setName('unowner')
    .setDescription('Retire un utilisateur de la liste owners')
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Utilisateur à retirer de la liste owners')
        .setRequired(true)
    ),
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
  options: [
    {
      name: 'utilisateur',
      description: 'Utilisateur à retirer (mention ou ID)',
      type: 6, // USER
      required: true
    }
  ],
<<<<<<< HEAD
  execute: async (message, args, client) => {
    const userId = args[0]?.replace(/[<@!>]/g, '');
    if (!userId) return message.reply('Merci de mentionner un utilisateur ou fournir son ID.');
    
    try {
      const user = await client.users.fetch(userId);
      const username = getUsernameTag(user);
      removeOwner(username);
      message.reply(`L'utilisateur ${user} a été retiré de la liste des owners.\nOwners actuels : ${getOwners().join(', ')}`);
    } catch (error) {
      message.reply('Utilisateur introuvable.');
    }
  },
  executeSlash: async (interaction) => {
=======
  execute: async (interaction, args, client) => {
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
    const user = interaction.options.getUser('utilisateur');
    if (!user) return interaction.reply({ content: 'Merci de sélectionner un utilisateur.', ephemeral: true });
    const username = getUsernameTag(user);
    removeOwner(username);
    interaction.reply({ content: `L'utilisateur ${user} a été retiré de la liste des owners.\nOwners actuels : ${getOwners().join(', ')}`, ephemeral: true });
  }
};