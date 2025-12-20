const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'purge',
  description: 'Supprime les derniers messages du salon.',
  category: 'admin',
  options: [],
  execute: async (message, args, client) => {
    try {
      // Vérifie si l'utilisateur a les permissions d'administrateur
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const m = await message.reply('❌ Vous n\'avez pas la permission d\'utiliser cette commande.');
        setTimeout(() => m.delete().catch(() => {}), 8000);
        return;
      }

      // Récupère le nombre de messages à supprimer depuis les arguments
      const nombre = parseInt(args[0], 10);

      // Vérifie que le nombre est valide (entre 1 et 100)
      if (Number.isNaN(nombre) || nombre < 1 || nombre > 100) {
        const m = await message.reply('❌ Veuillez spécifier un nombre entre 1 et 100. Exemple : `+purge 10`');
        setTimeout(() => m.delete().catch(() => {}), 8000);
        return;
      }

      // Vérifie les permissions du bot
      const me = message.guild.members.me || await message.guild.members.fetchMe();
      if (!me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        const m = await message.reply('❌ Je n\'ai pas la permission "Gérer les messages".');
        setTimeout(() => m.delete().catch(() => {}), 8000);
        return;
      }

      // Supprime les messages (Discord refuse >14 jours, le second param true ignore ceux trop vieux)
      const deleted = await message.channel.bulkDelete(nombre, true);

      const m = await message.channel.send(`✅ ${deleted.size} messages ont été supprimés.`);
      setTimeout(() => m.delete().catch(() => {}), 5000);

    } catch (error) {
      console.error('Erreur lors de la suppression des messages :', error);
      try {
        const m = await message.channel.send('❌ Une erreur est survenue lors de la suppression des messages.');
        setTimeout(() => m.delete().catch(() => {}), 8000);
      } catch {
        // ignore
      }
    }
  },
};
