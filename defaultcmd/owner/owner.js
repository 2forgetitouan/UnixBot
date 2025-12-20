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
  options: [
    {
      name: 'utilisateur',
      description: 'Utilisateur à ajouter (mention ou ID)',
      type: 6, // USER
      required: true
    }
  ],
  execute: async (interaction, args, client) => {
    const user = interaction.options.getUser('utilisateur');
    if (!user) return interaction.reply({ content: 'Merci de sélectionner un utilisateur.', ephemeral: true });
    const username = getUsernameTag(user);
    addOwner(username);
    interaction.reply({ content: `L'utilisateur ${user} a été ajouté à la liste des owners.\nOwners actuels : ${getOwners().join(', ')}`, ephemeral: true });
  }
};