const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  description: 'Affiche la latence du bot',
  category: 'infos',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Affiche la latence du bot'),
  options: [],

  execute: async (message, args, client) => {
    try {
      // Envoyer une réponse immédiate
      const sent = await message.reply('Calcul de la latence...');

      // Calculer les latences
      const roundtripLatency = sent.createdTimestamp - message.createdTimestamp;
      const wsLatency = client.ws.ping;

      // Fonction pour déterminer l'emoji et la couleur selon la latence
      const getLatencyInfo = (ms) => {
        if (ms < 120) {
          return { emoji: '🟢', color: '#00ff00', status: 'Excellente' };
        } else if (ms < 220) {
          return { emoji: '🟡', color: '#ffff00', status: 'Moyenne' };
        } else {
          return { emoji: '🔴', color: '#ff0000', status: 'Lente' };
        }
      };

      const wsInfo = getLatencyInfo(wsLatency);
      const roundtripInfo = getLatencyInfo(roundtripLatency);

      // Créer un embed pour la réponse
      const embed = new EmbedBuilder()
        // .setTitle('🏓 Pong!')
        .setColor(wsInfo.color)
        .addFields(
          { 
            name: 'Latence WebSocket', 
            value: `${wsInfo.emoji} ${wsLatency}ms (${wsInfo.status})`,
            inline: true 
          },
          { 
            name: 'Latence Bot', 
            value: `${roundtripInfo.emoji} ${roundtripLatency}ms (${roundtripInfo.status})`,
            inline: true 
          }
        )
        .setFooter({ text: 'UnixBot - Mesure de latence' })
        .setTimestamp();

      // Modifier le message avec l'embed
      await sent.edit({ content: null, embeds: [embed] });
      
    } catch (error) {
      console.error('Erreur dans la commande ping:', error);
      try {
        await message.reply('Une erreur est survenue lors de l\'exécution de la commande.');
      } catch (e) {
        console.error('Erreur lors de la gestion d\'erreur:', e);
      }
    }
  },
  executeSlash: async (interaction) => {
    try {
      await interaction.deferReply();
      
      const sent = await interaction.fetchReply();
      const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
      const wsLatency = interaction.client.ws.ping;

      const getLatencyInfo = (ms) => {
        if (ms < 120) {
          return { emoji: '🟢', color: '#00ff00', status: 'Excellente' };
        } else if (ms < 220) {
          return { emoji: '🟡', color: '#ffff00', status: 'Moyenne' };
        } else {
          return { emoji: '🔴', color: '#ff0000', status: 'Lente' };
        }
      };

      const wsInfo = getLatencyInfo(wsLatency);
      const roundtripInfo = getLatencyInfo(roundtripLatency);

      const embed = new EmbedBuilder()
        .setColor(wsInfo.color)
        .addFields(
          { 
            name: 'Latence WebSocket', 
            value: `${wsInfo.emoji} ${wsLatency}ms (${wsInfo.status})`,
            inline: true 
          },
          { 
            name: 'Latence Bot', 
            value: `${roundtripInfo.emoji} ${roundtripLatency}ms (${roundtripInfo.status})`,
            inline: true 
          }
        )
        .setFooter({ text: 'UnixBot - Mesure de latence' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Erreur dans la commande ping:', error);
      try {
        await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.' });
      } catch (e) {
        console.error('Erreur lors de la gestion d\'erreur:', e);
      }
    }
  }
};
