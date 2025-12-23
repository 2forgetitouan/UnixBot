<<<<<<< HEAD
const { SlashCommandBuilder } = require('discord.js');
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
const { addOwner, getOwners } = require('../../utils/isOwner');

function getUsernameTag(user) {
  if (user.discriminator === '0' || user.discriminator === '0000') {
    return user.username;
  }
  return `${user.username}#${user.discriminator}`;
}

module.exports = {
  name: 'owner',
  description: 'Ajoute un utilisateur à la liste owners.',
  category: 'admin',
<<<<<<< HEAD
  superuser: true,
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
  options: [
    {
      name: 'utilisateur',
      description: 'Utilisateur à ajouter (mention ou ID)',
      type: 6, // USER
      required: true
    }
  ],
<<<<<<< HEAD
  data: new SlashCommandBuilder()
    .setName('owner')
    .setDescription('Ajoute un utilisateur à la liste owners')
    .addUserOption(option =>
      option.setName('utilisateur')
        .setDescription('Utilisateur à ajouter')
        .setRequired(true)),
  
  executeSlash: async (interaction) => {
=======
  execute: async (interaction, args, client) => {
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
    const user = interaction.options.getUser('utilisateur');
    if (!user) return interaction.reply({ content: 'Merci de sélectionner un utilisateur.', ephemeral: true });
    const username = getUsernameTag(user);
    addOwner(username);
    interaction.reply({ content: `L'utilisateur ${user} a été ajouté à la liste des owners.\nOwners actuels : ${getOwners().join(', ')}`, ephemeral: true });
<<<<<<< HEAD
  },

  execute: async (message, args, client) => {
    if (!message.mentions.users.size && !args[0]) {
      return message.reply('Merci de mentionner un utilisateur ou de fournir son ID.');
    }
    const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
    if (!user) return message.reply('Utilisateur introuvable.');
    const username = getUsernameTag(user);
    addOwner(username);
    message.reply(`L'utilisateur ${user} a été ajouté à la liste des owners.\nOwners actuels : ${getOwners().join(', ')}`);
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
  }
};