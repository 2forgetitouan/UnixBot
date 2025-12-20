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
  options: [
    {
      name: 'utilisateur',
      description: 'Utilisateur à retirer (mention ou ID)',
      type: 6, // USER
      required: true
    }
  ],
  execute: async (interaction, args, client) => {
    const user = interaction.options.getUser('utilisateur');
    if (!user) return interaction.reply({ content: 'Merci de sélectionner un utilisateur.', ephemeral: true });
    const username = getUsernameTag(user);
    removeOwner(username);
    interaction.reply({ content: `L'utilisateur ${user} a été retiré de la liste des owners.\nOwners actuels : ${getOwners().join(', ')}`, ephemeral: true });
  }
};