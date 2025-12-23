const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isOwner } = require('../../utils/isOwner');
const { isSuperuser } = require('../../utils/isSuperuser');
const path = require('path');
const fs = require('fs');

const PERSISTENCE_FILE = path.join(__dirname, '../../config/autobump.json');

module.exports = {
  name: 'bumpstats',
  description: 'Affiche les statistiques de l\'auto-bump',
  category: 'utilitaire',
  data: new SlashCommandBuilder()
    .setName('bumpstats')
    .setDescription('Affiche les statistiques de l\'auto-bump'),
  options: [],

  executeSlash: async (interaction) => {
    try {
      // Récupérer les données globales
      const activeBumps = global.activeBumps || {};
      const bumpStats = global.bumpStats || {};
      
      // Vérifier s'il y a des bumps actifs
      const channelIds = Object.keys(activeBumps);
      const hasActiveBumps = channelIds.length > 0;
      
      // Créer l'embed
      const embed = new EmbedBuilder()
        .setColor(hasActiveBumps ? '#00FF00' : '#FF0000')
        .setTitle('📊 Statistiques Auto-Bump')
        .setTimestamp();
      
      // Ajouter l'avatar si disponible
      if (hasActiveBumps) {
        const firstChannelId = channelIds[0];
        const firstBumpState = activeBumps[firstChannelId];
        if (firstBumpState.selfbotAvatar) {
          embed.setThumbnail(firstBumpState.selfbotAvatar);
        }
      }

      if (!hasActiveBumps) {
        embed.setDescription('❌ Aucun auto-bump n\'est actuellement actif.')
          .addFields({
            name: '💡 Information',
            value: 'Utilisez `/selfbump [Salon_ID]` pour activer l\'auto-bump.',
            inline: false
          });
      } else {
        // Pour chaque salon actif
        for (const channelId of channelIds) {
          const bumpState = activeBumps[channelId];
          const stats = bumpStats[channelId] || {
            disboard: { total: 0, lastBump: null },
            discordInvite: { total: 0, lastBump: null }
          };
          
          let channelInfo = `🟢 **Statut :** Actif\n`;
          
          // Afficher l'utilisateur selfbot
          if (bumpState.selfbotUser) {
            channelInfo += `👤 **Utilisateur :** ${bumpState.selfbotUser}\n\n`;
          } else {
            channelInfo += `\n`;
          }
          
          // Stats Disboard
          const disboardNextTime = bumpState.nextBumpTimes['302050872383242240'];
          const disboardStats = stats.disboard;
          
          channelInfo += `**🤖 Disboard**\n`;
          channelInfo += `├ 📈 Bumps totaux : **${disboardStats.total}**\n`;
          
          if (disboardStats.lastBump) {
            const lastBumpTime = new Date(disboardStats.lastBump);
            channelInfo += `├ 🕐 Dernier bump : <t:${Math.floor(lastBumpTime.getTime() / 1000)}:R>\n`;
          } else {
            channelInfo += `├ 🕐 Dernier bump : *Aucun*\n`;
          }
          
          if (disboardNextTime) {
            const now = Date.now();
            const timeLeft = disboardNextTime.getTime() - now;
            
            if (timeLeft > 0) {
              const hours = Math.floor(timeLeft / 3600000);
              const minutes = Math.floor((timeLeft % 3600000) / 60000);
              
              channelInfo += `├ ⏱️ Temps restant : **${hours}h ${minutes}m**\n`;
              channelInfo += `└ 📅 Prochain bump : <t:${Math.floor(disboardNextTime.getTime() / 1000)}:f>\n\n`;
            } else {
              channelInfo += `└ ⏱️ Bump en cours...\n\n`;
            }
          } else {
            channelInfo += `└ ⏱️ En attente de démarrage...\n\n`;
          }
          
          // Stats Discord Invite
          const discordInviteNextTime = bumpState.nextBumpTimes['678211574183362571'];
          const discordInviteStats = stats.discordInvite;
          
          channelInfo += `**🤖 Discord Invite**\n`;
          channelInfo += `├ 📈 Bumps totaux : **${discordInviteStats.total}**\n`;
          
          if (discordInviteStats.lastBump) {
            const lastBumpTime = new Date(discordInviteStats.lastBump);
            channelInfo += `├ 🕐 Dernier bump : <t:${Math.floor(lastBumpTime.getTime() / 1000)}:R>\n`;
          } else {
            channelInfo += `├ 🕐 Dernier bump : *Aucun*\n`;
          }
          
          if (discordInviteNextTime) {
            const now = Date.now();
            const timeLeft = discordInviteNextTime.getTime() - now;
            
            if (timeLeft > 0) {
              const hours = Math.floor(timeLeft / 3600000);
              const minutes = Math.floor((timeLeft % 3600000) / 60000);
              
              channelInfo += `├ ⏱️ Temps restant : **${hours}h ${minutes}m**\n`;
              channelInfo += `└ 📅 Prochain bump : <t:${Math.floor(discordInviteNextTime.getTime() / 1000)}:f>\n`;
            } else {
              channelInfo += `└ ⏱️ Bump en cours...\n`;
            }
          } else {
            channelInfo += `└ ⏱️ En attente de démarrage...\n`;
          }
          
          embed.addFields({
            name: `📍 Salon : <#${channelId}>`,
            value: channelInfo,
            inline: false
          });
        }
        
        // Statistiques globales
        const totalBumps = Object.values(bumpStats).reduce((acc, stat) => {
          return acc + (stat.disboard?.total || 0) + (stat.discordInvite?.total || 0);
        }, 0);
        
        embed.addFields({
          name: '📊 Total Global',
          value: `**${totalBumps}** bumps effectués au total`,
          inline: false
        });
      }

      // Vérifier si l'utilisateur est owner ou superuser
      const username = interaction.user.tag;
      const isAuthorized = isOwner(username) || isSuperuser(username);
      
      if (isAuthorized && hasActiveBumps) {
        // Ajouter un bouton pour désactiver
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('bump_disable')
              .setLabel('🔴 Désactiver l\'auto-bump')
              .setStyle(ButtonStyle.Danger)
          );
        
        await interaction.reply({ embeds: [embed], components: [row] });
      } else if (isAuthorized && !hasActiveBumps) {
        // Ajouter un message informatif
        embed.addFields({
          name: '🎮 Action',
          value: 'Pour activer l\'auto-bump, utilisez `/selfbump [Salon_ID]`',
          inline: false
        });
        
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Erreur lors de l\'exécution de /bumpstats:', error);
      
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de la récupération des statistiques.')
        .setTimestamp();
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },

  // Gérer les interactions des boutons
  handleButton: async (interaction) => {
    const username = interaction.user.tag;
    const isAuthorized = isOwner(username) || isSuperuser(username);
    
    if (!isAuthorized) {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Accès refusé')
        .setDescription('Seuls les administrateurs peuvent désactiver l\'auto-bump.')
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    if (interaction.customId === 'bump_disable') {
      const activeBumps = global.activeBumps || {};
      const channelIds = Object.keys(activeBumps);
      
      if (channelIds.length === 0) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Aucun auto-bump actif')
          .setDescription('Il n\'y a aucun auto-bump à désactiver.')
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
      // Désactiver tous les bumps
      let stoppedCount = 0;
      for (const channelId of channelIds) {
        const bumpState = activeBumps[channelId];
        if (bumpState && bumpState.client) {
          try {
            bumpState.client.destroy();
            stoppedCount++;
          } catch (error) {
            console.error(`Erreur lors de l'arrêt du bump pour ${channelId}:`, error);
          }
        }
        delete activeBumps[channelId];
      }
      
      // Supprimer le fichier de persistance
      try {
        if (fs.existsSync(PERSISTENCE_FILE)) {
          fs.unlinkSync(PERSISTENCE_FILE);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de la persistance:', error);
      }
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Auto-bump désactivé')
        .setDescription(`${stoppedCount} auto-bump(s) ont été désactivés avec succès.`)
        .setFooter({ text: `Désactivé par ${username}` })
        .setTimestamp();
      
      // Mettre à jour le message original
      await interaction.update({ embeds: [embed], components: [] });
    }
  }
};
