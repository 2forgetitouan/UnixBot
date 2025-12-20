const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'reroll',
  description: 'Relance le choix des gagnants du dernier giveaway',
  category: 'événements',
  options: [],

  execute: async (message, args, client) => {
    try {
      // Supprimer le message de commande
      await message.delete().catch(() => {});

      // Charger les données des giveaways
      const giveawaysFile = path.join(__dirname, '../../config/giveaways.json');
      
      if (!fs.existsSync(giveawaysFile)) {
        const errorMsg = await message.channel.send('❌ Aucun giveaway trouvé.');
        setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        return;
      }

      let data;
      try {
        data = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
      } catch {
        const errorMsg = await message.channel.send('❌ Erreur lors de la lecture des données.');
        setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        return;
      }

      const lastGiveaway = data.last;

      if (!lastGiveaway || !lastGiveaway.ended) {
        const errorMsg = await message.channel.send('❌ Aucun giveaway terminé trouvé.');
        setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        return;
      }

      // Récupérer le message du giveaway
      const channel = await client.channels.fetch(lastGiveaway.channelId);
      const giveawayMessage = await channel.messages.fetch(lastGiveaway.messageId);

      if (lastGiveaway.participants.length === 0) {
        const errorMsg = await message.channel.send('❌ Aucun participant au giveaway.');
        setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        return;
      }

      // Choisir de nouveaux gagnants
      const participantsCopy = [...lastGiveaway.participants];
      const winners = [];
      const count = Math.min(lastGiveaway.winnersCount, participantsCopy.length);

      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * participantsCopy.length);
        winners.push(participantsCopy.splice(randomIndex, 1)[0]);
      }

      // Récupérer les objets utilisateurs
      const winnerUsers = [];
      for (const winnerId of winners) {
        try {
          const user = await client.users.fetch(winnerId);
          winnerUsers.push(user);
        } catch (err) {
          console.error('Erreur fetch user:', err);
        }
      }

      const winnersText = winnerUsers.map(w => `<@${w.id}>`).join(', ');
      const winnersListText = winnerUsers.map((w, i) => `${i + 1}. ${w.username} (${w.tag})`).join('\n');
      const organizer = await client.users.fetch(lastGiveaway.organizerId);

      // Mettre à jour l'embed du giveaway
      const updatedEmbed = new EmbedBuilder()
        .setTitle('🎊 GIVEAWAY TERMINÉ 🎊')
        .setDescription(`\n**🎁 Lot**\n> ${lastGiveaway.prize}\n\n**🎉 Nouveaux Gagnant(s)**\n${winnersText}\n\n\`\`\`\n${winnersListText}\n\`\`\`\n`)
        .setColor('#FFA500')
        .addFields(
          { name: '👥 Participants', value: `\`\`\`${lastGiveaway.participants.length}\`\`\``, inline: true },
          { name: '👑 Gagnants', value: `\`\`\`${winners.length}\`\`\``, inline: true }
        )
        .setFooter({ text: `Organisé par ${organizer.username} - Gagnants relancés`, iconURL: organizer.displayAvatarURL() })
        .setTimestamp();

      // Désactiver le bouton
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('giveaway_ended')
            .setLabel('Terminé')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

      await giveawayMessage.edit({ embeds: [updatedEmbed], components: [disabledRow] });

      // Annoncer les nouveaux gagnants
      await message.channel.send(`# 🔄 🎉 Félicitations !\n${winnersText}\n> __Vous avez gagné :__ **${lastGiveaway.prize}** !`);

      // Mettre à jour les données
      lastGiveaway.winners = winners;
      data.last = lastGiveaway;
      fs.writeFileSync(giveawaysFile, JSON.stringify(data, null, 2));

    } catch (error) {
      console.error('Erreur dans la commande reroll:', error);
      const errorMsg = await message.channel.send('❌ Une erreur est survenue lors du reroll.');
      setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
    }
  }
};
