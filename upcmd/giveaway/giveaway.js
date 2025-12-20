const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Stockage des giveaways actifs
const giveawaysFile = path.join(__dirname, '../../config/giveaways.json');
let activeGiveaways = [];
let lastGiveaway = null;

function getGiveawayFromStorage(messageId) {
  if (!fs.existsSync(giveawaysFile)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
    const fromActive = (data.active || []).find(g => g.messageId === messageId);
    if (fromActive) return fromActive;
    if (data.last && data.last.messageId === messageId) return data.last;
  } catch (err) {
    console.error('Erreur lecture giveaway:', err);
  }
  return null;
}

// Charger les giveaways sauvegardés
function loadGiveaways() {
  if (fs.existsSync(giveawaysFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
      activeGiveaways = data.active || [];
      lastGiveaway = data.last || null;
    } catch (err) {
      console.error('Erreur chargement giveaways:', err);
    }
  }
}

loadGiveaways();

// Sauvegarder les giveaways
function saveGiveaways() {
  try {
    fs.writeFileSync(giveawaysFile, JSON.stringify({
      active: activeGiveaways,
      last: lastGiveaway
    }, null, 2));
  } catch (err) {
    console.error('Erreur sauvegarde giveaways:', err);
  }
}

module.exports = {
  name: 'giveaway',
  description: 'Crée un giveaway avec participants et durée',
  category: 'événements',
  options: [],

  execute: async (message, args, client) => {
    try {
      // Supprimer le message de commande
      await message.delete().catch(() => {});

      // Vérifier les arguments
      if (args.length < 3) {
        const errorMsg = await message.channel.send('❌ Usage: `+giveaway [lot/titre] [nombre gagnants] [temps]`\nExemples:\n• `+giveaway "Nitro Discord" 1 1j` (1 jour)\n• `+giveaway "Nitro" 1 12h` (12 heures)\n• `+giveaway "Boost" 2 30m` (30 minutes)');
        setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        throw new Error('Arguments insuffisants');
      }

      // Parser les arguments - gérer les espaces avec guillemets
      let prize, winnersCount, timeString;
      
      // Reconstituer les arguments en gérant les guillemets
      const fullArgs = args.join(' ');
      const quoteMatch = fullArgs.match(/^["'](.+?)["']\s+(\d+)\s+(\d+[jmh])$/i);
      
      if (quoteMatch) {
        // Format avec guillemets : "titre avec espaces" 1 5m
        prize = quoteMatch[1];
        winnersCount = parseInt(quoteMatch[2]);
        timeString = quoteMatch[3];
      } else if (args.length >= 3) {
        // Format sans guillemets : Titre 1 5m (sans espaces dans le titre)
        prize = args[0];
        winnersCount = parseInt(args[1]);
        timeString = args[2];
      } else {
        const errorMsg = await message.channel.send('❌ Format invalide. Utilisez des guillemets pour les titres avec espaces.\nExemple: `+giveaway "Mon Super Prix" 1 5m`');
        setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        throw new Error('Format invalide');
      }

      // Validation
      if (isNaN(winnersCount) || winnersCount < 1) {
        const errorMsg = await message.channel.send('❌ Le nombre de gagnants doit être un nombre positif.');
        setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        throw new Error('Nombre de gagnants invalide');
      }

      // Parser la durée (format: 1j, 12h, 30m)
      const timeMatch = timeString.match(/^(\d+)(j|h|m)$/i);
      if (!timeMatch) {
        const errorMsg = await message.channel.send('❌ Format de temps invalide.\nUtilisez: `1j` (jours), `1h` (heures), ou `1m` (minutes)\nExemple: `+giveaway "Nitro" 1 12h`');
        setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        throw new Error('Format de temps invalide');
      }

      const timeValue = parseInt(timeMatch[1]);
      const timeUnit = timeMatch[2].toLowerCase();

      if (timeValue <= 0) {
        const errorMsg = await message.channel.send('❌ La durée doit être un nombre positif.');
        setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        throw new Error('Durée invalide');
      }

      // Convertir en millisecondes
      let durationMs;
      switch (timeUnit) {
        case 'j':
          durationMs = timeValue * 24 * 60 * 60 * 1000;
          break;
        case 'h':
          durationMs = timeValue * 60 * 60 * 1000;
          break;
        case 'm':
          durationMs = timeValue * 60 * 1000;
          break;
      }

      // Recharger depuis le fichier pour éviter de réécrire un giveaway supprimé
      loadGiveaways();

      const endTime = Date.now() + durationMs;
      
      // Créer l'embed (inspiré de Draftbot)
      const embed = new EmbedBuilder()
        .setTitle('🎊 GIVEAWAY EN COURS 🎊')
        .setDescription(`\n**🎁 Lot à gagner**\n> ${prize}\n`)
        .setColor('#5865F2')
        .addFields(
          { name: '👑 Nombre de gagnants', value: `\`\`\`${winnersCount} gagnant(s)\`\`\``, inline: true },
          { name: '⏱️ Temps restant', value: `\`\`\`${formatTimeLeft(endTime)}\`\`\``, inline: true },
          { name: '👥 Participants', value: `\`\`\`0 participant(s)\`\`\``, inline: true },
          { name: '📅 Fin du giveaway', value: `<t:${Math.floor(endTime / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: `Organisé par ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp(endTime)
        .setThumbnail('https://cdn.discordapp.com/emojis/1067086714991456326.gif'); // Emoji animé giveaway

      // Créer le bouton de participation
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway_join_${Date.now()}`)
            .setLabel('🎉 Participer')
            .setStyle(ButtonStyle.Success)
        );

      const giveawayMsg = await message.channel.send({ 
        embeds: [embed],
        components: [row]
      });

      // Maintenant qu'on a le messageId, mettre à jour le bouton
      const updatedRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway_join_${giveawayMsg.id}`)
            .setLabel('🎉 Participer')
            .setStyle(ButtonStyle.Success)
        );

      await giveawayMsg.edit({ components: [updatedRow] });

      // Stocker le giveaway
      const giveaway = {
        messageId: giveawayMsg.id,
        channelId: message.channel.id,
        guildId: message.guild.id,
        prize: prize,
        winnersCount: winnersCount,
        endTime: endTime,
        participants: [],
        ended: false,
        organizerId: message.author.id
      };

      activeGiveaways.push(giveaway);
      saveGiveaways();

      // Mettre à jour l'embed toutes les minutes
      const updateInterval = setInterval(async () => {
        const latest = getGiveawayFromStorage(giveaway.messageId);
        if (!latest || latest.ended) {
          clearInterval(updateInterval);
          return;
        }
        await updateGiveawayEmbed(latest, client);
      }, 60000); // Toutes les 60 secondes

      // Timer pour la fin du giveaway
      scheduleGiveawayEnd(giveaway, client, updateInterval);

    } catch (error) {
      console.error('Erreur dans la commande giveaway:', error);
      const errorMsg = await message.channel.send('❌ Une erreur est survenue lors de la création du giveaway.');
      setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
    }
  }
};

// Fonction pour formater le temps restant
function formatTimeLeft(endTime) {
  const now = Date.now();
  const diff = endTime - now;

  if (diff <= 0) return 'Terminé';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}j ${hours}h ${minutes}min`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else {
    return `${minutes}min`;
  }
}

// Fonction pour mettre à jour l'embed du giveaway
async function updateGiveawayEmbed(giveaway, client) {
  try {
    const stored = getGiveawayFromStorage(giveaway.messageId);
    if (!stored) return;

    giveaway = { ...giveaway, ...stored };
    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(giveaway.messageId);
    const organizer = await client.users.fetch(giveaway.organizerId);

    // S'assurer que participants est un tableau
    if (!giveaway.participants) {
      giveaway.participants = [];
    }

    const embed = new EmbedBuilder()
      .setTitle('🎊 GIVEAWAY EN COURS 🎊')
      .setDescription(`\n**🎁 Lot à gagner**\n> ${giveaway.prize}\n`)
      .setColor('#5865F2')
      .addFields(
        { name: '👑 Nombre de gagnants', value: `\`\`\`${giveaway.winnersCount} gagnant(s)\`\`\``, inline: true },
        { name: '⏱️ Temps restant', value: `\`\`\`${formatTimeLeft(giveaway.endTime)}\`\`\``, inline: true },
        { name: '👥 Participants', value: `\`\`\`${giveaway.participants.length} participant(s)\`\`\``, inline: true },
        { name: '📅 Fin du giveaway', value: `<t:${Math.floor(giveaway.endTime / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: `Organisé par ${organizer.username}`, iconURL: organizer.displayAvatarURL() })
      .setTimestamp(giveaway.endTime)
      .setThumbnail('https://cdn.discordapp.com/emojis/1067086714991456326.gif');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_join_${giveaway.messageId}`)
          .setLabel('🎉 Participer')
          .setStyle(ButtonStyle.Success)
      );

    await message.edit({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Erreur mise à jour embed:', error);
  }
}

// Fonction pour terminer un giveaway
async function endGiveaway(giveaway, client) {
  try {
    if (!fs.existsSync(giveawaysFile)) return;

    // Recharger les données depuis le fichier pour avoir l'état à jour
    const data = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
    const currentGiveaway = (data.active || []).find(g => g.messageId === giveaway.messageId);
    const latest = currentGiveaway || (data.last && data.last.messageId === giveaway.messageId ? data.last : null);

    if (!latest) {
      return;
    }

    // Si la date de fin a été décalée dans le futur, reprogrammer la fin
    if (!latest.ended && latest.endTime > Date.now()) {
      scheduleGiveawayEnd(latest, client);
      return;
    }

    giveaway = { ...giveaway, ...latest };

    const channel = await client.channels.fetch(giveaway.channelId);
    let message;
    
    try {
      message = await channel.messages.fetch(giveaway.messageId);
    } catch (fetchError) {
      // Le message n'existe plus (supprimé) - nettoyer silencieusement
      if (fetchError.code === 10008) {
        console.log(`Message du giveaway "${giveaway.prize}" introuvable (supprimé) - nettoyage...`);
        const cleanupData = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
        cleanupData.active = cleanupData.active.filter(g => g.messageId !== giveaway.messageId);
        fs.writeFileSync(giveawaysFile, JSON.stringify(cleanupData, null, 2));
        return;
      }
      throw fetchError;
    }
    
    const organizer = await client.users.fetch(giveaway.organizerId);

    // S'assurer que participants est un tableau
    if (!giveaway.participants) {
      giveaway.participants = [];
    }

    if (giveaway.participants.length === 0) {
      const endEmbed = new EmbedBuilder()
        .setTitle('🎊 GIVEAWAY TERMINÉ 🎊')
        .setDescription(`\n**🎁 Lot**\n> ${giveaway.prize}\n\n**❌ Résultat**\n> Aucun participant...\n`)
        .setColor('#FF0000')
        .addFields(
          { name: '👑 Gagnants prévus', value: `\`\`\`${giveaway.winnersCount}\`\`\``, inline: true },
          { name: '👥 Participants', value: `\`\`\`0\`\`\``, inline: true }
        )
        .setFooter({ text: `Organisé par ${organizer.username}`, iconURL: organizer.displayAvatarURL() })
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

      await message.edit({ embeds: [endEmbed], components: [disabledRow] });
      
      // Mettre à jour le fichier
      const noParticipantsData = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
      giveaway.ended = true;
      noParticipantsData.last = giveaway;
      noParticipantsData.active = noParticipantsData.active.filter(g => g.messageId !== giveaway.messageId);
      fs.writeFileSync(giveawaysFile, JSON.stringify(noParticipantsData, null, 2));
      
      return;
    }

    // Choisir les gagnants
    const participantsCopy = [...giveaway.participants];
    const winners = [];
    const count = Math.min(giveaway.winnersCount, participantsCopy.length);

    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * participantsCopy.length);
      winners.push(participantsCopy.splice(randomIndex, 1)[0]);
    }

    const guild = channel.guild || await client.guilds.fetch(giveaway.guildId).catch(() => null);
    const winnerEntries = [];

    for (const winnerId of winners) {
      let user = null;
      let member = null;
      try {
        user = await client.users.fetch(winnerId);
      } catch (err) {
        console.error('Erreur fetch user:', err);
      }

      if (guild) {
        try {
          member = await guild.members.fetch(winnerId);
        } catch (err) {
          // ignorer si non trouvé
        }
      }

      const displayName = member?.displayName || user?.globalName || user?.username || 'Inconnu';
      const tag = user?.tag || 'Inconnu';
      const mention = user ? `<@${user.id}>` : `<@${winnerId}>`;

      winnerEntries.push({ mention, displayName, tag });
    }

    const winnersText = winnerEntries.map(w => w.mention).join(', ');
    const winnersListText = winnerEntries.map((w, i) => `${i + 1}. ${w.displayName} (${w.tag})`).join('\n');

    const endEmbed = new EmbedBuilder()
      .setTitle('🎊 GIVEAWAY TERMINÉ 🎊')
      .setDescription(`\n**🎁 Lot**\n> ${giveaway.prize}\n\n**🎉 Gagnant(s)**\n${winnersText}\n\n\`\`\`\n${winnersListText}\n\`\`\`\n`)
      .setColor('#00FF00')
      .addFields(
        { name: '👥 Participants', value: `\`\`\`${giveaway.participants.length}\`\`\``, inline: true },
        { name: '👑 Gagnants', value: `\`\`\`${winners.length}\`\`\``, inline: true }
      )
      .setFooter({ text: `Organisé par ${organizer.username}`, iconURL: organizer.displayAvatarURL() })
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

    await message.edit({ embeds: [endEmbed], components: [disabledRow] });
    await channel.send(`# 🎉 Félicitations !\n${winnersText}\nVous avez gagné : **${giveaway.prize}** !`);

    // Sauvegarder comme dernier giveaway et retirer des actifs
    const saveData = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
    giveaway.ended = true;
    giveaway.winners = winners;
    saveData.last = giveaway;
    saveData.active = saveData.active.filter(g => g.messageId !== giveaway.messageId);
    fs.writeFileSync(giveawaysFile, JSON.stringify(saveData, null, 2));

  } catch (error) {
    console.error('Erreur fin giveaway:', error);
  }
}

function scheduleGiveawayEnd(giveaway, client, updateInterval) {
  const timeLeft = giveaway.endTime - Date.now();

  if (timeLeft <= 0 || giveaway.ended) {
    if (updateInterval) clearInterval(updateInterval);
    endGiveaway(giveaway, client);
    return;
  }

  setTimeout(async () => {
    if (updateInterval) clearInterval(updateInterval);
    await endGiveaway(giveaway, client);
  }, timeLeft);
}

// Exporter les fonctions pour les utiliser ailleurs
module.exports.activeGiveaways = activeGiveaways;
module.exports.updateGiveawayEmbed = updateGiveawayEmbed;
module.exports.endGiveaway = endGiveaway;
module.exports.saveGiveaways = saveGiveaways;
module.exports.loadGiveaways = loadGiveaways;
module.exports.scheduleGiveawayEnd = scheduleGiveawayEnd;
module.exports.getGiveawayFromStorage = getGiveawayFromStorage;

// Restaurer les giveaways actifs au démarrage
setTimeout(() => {
  const bot = require('../../bot');
  const client = bot.client;
  
  loadGiveaways();
  
  // Relancer les timers pour les giveaways actifs
  if (activeGiveaways && activeGiveaways.length > 0) {
    activeGiveaways.forEach(giveaway => {
      const timeLeft = giveaway.endTime - Date.now();
      
      if (timeLeft > 0 && !giveaway.ended) {
        console.log(`Restauration du giveaway: ${giveaway.prize} (${Math.floor(timeLeft / 1000 / 60)}min restantes)`);
        scheduleGiveawayEnd(giveaway, client);
      } else if (!giveaway.ended) {
        console.log(`Fin immédiate du giveaway expiré: ${giveaway.prize}`);
        endGiveaway(giveaway, client);
      }
    });
  }
}, 5000);
