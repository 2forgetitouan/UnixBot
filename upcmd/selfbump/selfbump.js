const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Chargement différé du module selfbot
let SelfbotClient = null;
function getSelfbotClient() {
  if (!SelfbotClient) {
    SelfbotClient = require('discord.js-selfbot-v13').Client;
  }
  return SelfbotClient;
}

// Configuration des bots de bump avec leurs intervalles personnalisés
const BUMP_BOTS = [
    { 
        id: '302050872383242240', 
        name: 'Disboard',
        minDelay: 7200000,  // 2h
        maxDelay: 11100000  // 3h05
    },
    { 
        id: '678211574183362571', 
        name: 'Discord Invite',
        minDelay: 14400000, // 4h
        maxDelay: 18300000  // 5h05
    }
];

const MAX_FAILURES = 5;

// Stockage global des instances de bump actives
global.activeBumps = global.activeBumps || {};
global.bumpStats = global.bumpStats || {};

// Fichier de persistance
const PERSISTENCE_FILE = path.join(__dirname, '../../config/autobump.json');

// Sauvegarder l'état de persistance
function savePersistence() {
  try {
    const persistence = {};
    
    Object.keys(global.activeBumps || {}).forEach(channelId => {
      persistence[channelId] = {
        active: true,
        stats: global.bumpStats[channelId] || {
          disboard: { total: 0, lastBump: null },
          discordInvite: { total: 0, lastBump: null }
        }
      };
    });
    
    fs.writeFileSync(PERSISTENCE_FILE, JSON.stringify(persistence, null, 2));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la persistance:', error);
  }
}

// Charger l'état de persistance
function loadPersistence() {
  try {
    if (fs.existsSync(PERSISTENCE_FILE)) {
      const data = JSON.parse(fs.readFileSync(PERSISTENCE_FILE, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la persistance:', error);
  }
  return {};
}

// Restaurer les auto-bumps au démarrage
function restoreAutoBumps() {
  const persistence = loadPersistence();
  const configPath = path.join(__dirname, '../../config/config.json');
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const userToken = config.userToken;
    
    if (!userToken) {
      console.log('⚠️  Pas de userToken configuré, impossible de restaurer les auto-bumps');
      return;
    }
    
    Object.keys(persistence).forEach(channelId => {
      if (persistence[channelId].active) {
        console.log(`🔄 Restauration de l'auto-bump pour le salon ${channelId}`);
        
        // Restaurer les stats
        global.bumpStats[channelId] = persistence[channelId].stats;
        
        // Redémarrer l'auto-bump
        setTimeout(() => {
          startAutoBump(channelId, userToken, 'Système (redémarrage)');
        }, 5000); // Délai de 5s pour laisser le bot se connecter
      }
    });
  } catch (error) {
    console.error('Erreur lors de la restauration des auto-bumps:', error);
  }
}

module.exports = {
  name: 'selfbump',
  description: 'Active l\'auto-bump pour un salon Discord',
  category: 'utilitaire',
  data: new SlashCommandBuilder()
    .setName('selfbump')
    .setDescription('Active l\'auto-bump pour un salon Discord')
    .addStringOption(option =>
      option.setName('salon_id')
        .setDescription('L\'ID du salon où effectuer les bumps')
        .setRequired(true)),
  options: [],

  executeSlash: async (interaction) => {
    try {
      const channelId = interaction.options.getString('salon_id');
      
      // Vérifier si un bump est déjà actif pour ce salon
      if (global.activeBumps[channelId]) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Auto-bump déjà actif')
          .setDescription(`Un auto-bump est déjà en cours pour ce salon.`)
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Charger le token utilisateur depuis config.json
      const configPath = path.join(__dirname, '../../config/config.json');
      let userToken;
      
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        userToken = config.userToken;
        
        if (!userToken) {
          const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de configuration')
            .setDescription('Le token utilisateur n\'est pas configuré dans `config.json`.\nAjoutez la clé `"userToken": "votre_token"` dans le fichier de configuration.')
            .setTimestamp();
          
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (error) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Erreur de lecture')
          .setDescription('Impossible de lire le fichier de configuration.')
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Créer un embed de confirmation
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Auto-bump activé')
        .setDescription(`L'auto-bump a été activé pour le salon <#${channelId}>`)
        .addFields(
          { name: '📍 Salon', value: `<#${channelId}>`, inline: true },
          { name: '🤖 Bots configurés', value: BUMP_BOTS.map(b => b.name).join('\n'), inline: true }
        )
        .setFooter({ text: 'Le bump démarrera dans quelques secondes...' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Démarrer l'auto-bump
      startAutoBump(channelId, userToken, interaction.user.tag);
      
      // Sauvegarder la persistance
      savePersistence();

    } catch (error) {
      console.error('Erreur lors de l\'exécution de /selfbump:', error);
      
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de l\'activation de l\'auto-bump.')
        .setTimestamp();
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }
};

// Exporter les fonctions utilitaires
module.exports.restoreAutoBumps = restoreAutoBumps;
module.exports.savePersistence = savePersistence;

function startAutoBump(channelId, userToken, initiatedBy) {
  const SelfbotClientClass = getSelfbotClient();
  const selfbot = new SelfbotClientClass({
    checkUpdate: false,
    ws: {
      properties: {
        browser: 'Discord Client'
      }
    }
  });

  const bumpState = {
    client: selfbot,
    isRunning: {},
    nextBumpTimes: {},
    failureCounts: {},
    channelId: channelId,
    selfbotUser: null,
    selfbotAvatar: null
  };

  // Initialiser les états pour chaque bot
  BUMP_BOTS.forEach(bot => {
    bumpState.isRunning[bot.id] = false;
    bumpState.nextBumpTimes[bot.id] = null;
    bumpState.failureCounts[bot.id] = 0;
  });

  global.activeBumps[channelId] = bumpState;

  // Initialiser les statistiques pour ce salon si elles n'existent pas
  if (!global.bumpStats[channelId]) {
    global.bumpStats[channelId] = {
      disboard: { total: 0, lastBump: null },
      discordInvite: { total: 0, lastBump: null }
    };
  }

  // Fonction pour générer un délai aléatoire personnalisé par bot
  function getRandomDelay(bot) {
    const baseDelay = Math.random() * (bot.maxDelay - bot.minDelay) + bot.minDelay;
    
    // Ajoute une variance supplémentaire basée sur l'heure de la journée
    const hour = new Date().getHours();
    const variance = (hour >= 2 && hour <= 7) ? 1.15 : 1.0; // Plus long la nuit
    
    return Math.round(baseDelay * variance);
  }

  // Fonction pour attendre un délai aléatoire court (simule comportement humain)
  function randomHumanDelay(min = 1000, max = 3000) {
    return new Promise(resolve => 
      setTimeout(resolve, Math.random() * (max - min) + min)
    );
  }

  selfbot.on('ready', async () => {
    console.log(`[${new Date().toLocaleString()}] Selfbot connecté pour auto-bump (salon: ${channelId}, initié par: ${initiatedBy})`);
    
    // Enregistrer l'utilisateur selfbot et son avatar
    bumpState.selfbotUser = selfbot.user.tag;
    bumpState.selfbotAvatar = selfbot.user.displayAvatarURL({ size: 256 });
    
    let channel;
    try {
      channel = await selfbot.channels.fetch(channelId);
      if (!channel) {
        console.error(`❌ Salon ${channelId} introuvable`);
        delete global.activeBumps[channelId];
        selfbot.destroy();
        return;
      }
      console.log(`✓ Salon trouvé: ${channel.name || channel.id}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération du salon ${channelId}:`, error.message);
      delete global.activeBumps[channelId];
      selfbot.destroy();
      return;
    }
    
    async function bumpBot(bot) {
      if (bumpState.isRunning[bot.id]) {
        console.log(`⏳ Un bump ${bot.name} est déjà en cours pour ${channelId}...`);
        return;
      }
      
      bumpState.isRunning[bot.id] = true;
      
      try {
        // Délai aléatoire avant d'envoyer (simule lecture/réflexion)
        await randomHumanDelay(2000, 5000);
        
        console.log(`[${new Date().toLocaleString()}] 📤 Envoi du bump ${bot.name} dans ${channelId}...`);
        await channel.sendSlash(bot.id, 'bump');
        
        bumpState.failureCounts[bot.id] = 0; // Reset en cas de succès
        console.log(`✓ Bump ${bot.name} envoyé avec succès dans ${channelId}!`);
        
        // Enregistrer les statistiques
        const statKey = bot.name === 'Disboard' ? 'disboard' : 'discordInvite';
        if (!global.bumpStats[channelId]) {
          global.bumpStats[channelId] = {
            disboard: { total: 0, lastBump: null },
            discordInvite: { total: 0, lastBump: null }
          };
        }
        global.bumpStats[channelId][statKey].total++;
        global.bumpStats[channelId][statKey].lastBump = new Date().toISOString();
        
        // Sauvegarder la persistance après chaque bump
        savePersistence();
        
        // Attendre un peu avant de programmer le prochain
        await randomHumanDelay(1000, 2000);
        
      } catch (error) {
        bumpState.failureCounts[bot.id]++;
        console.error(`❌ Erreur lors du bump ${bot.name} dans ${channelId} (tentative ${bumpState.failureCounts[bot.id]}/${MAX_FAILURES}):`, error.message);
        
        if (bumpState.failureCounts[bot.id] >= MAX_FAILURES) {
          console.error(`💥 Trop d'échecs consécutifs pour ${bot.name} dans ${channelId}. Désactivation de ce bot.`);
          return;
        }
        
        // En cas d'erreur, réessayer avec un délai plus court
        const retryDelay = 60000 * bumpState.failureCounts[bot.id]; // 1min, 2min, 3min...
        console.log(`⏰ Nouvelle tentative ${bot.name} dans ${channelId} dans ${retryDelay / 60000} minute(s)`);
        setTimeout(() => {
          bumpState.isRunning[bot.id] = false;
          bumpBot(bot);
        }, retryDelay);
        return;
      } finally {
        bumpState.isRunning[bot.id] = false;
      }
      
      scheduleNextBump(bot);
    }

    function scheduleNextBump(bot) {
      const delay = getRandomDelay(bot);
      bumpState.nextBumpTimes[bot.id] = new Date(Date.now() + delay);
      
      const hours = Math.floor(delay / 3600000);
      const minutes = Math.floor((delay % 3600000) / 60000);
      
      console.log(`⏰ Prochain bump ${bot.name} dans ${channelId} prévu à: ${bumpState.nextBumpTimes[bot.id].toLocaleString()} (dans ${hours}h${minutes}min)`);
      
      setTimeout(() => {
        bumpBot(bot);
      }, delay);
    }
    
    // Démarrage initial pour chaque bot avec des délais aléatoires décalés
    BUMP_BOTS.forEach((bot, index) => {
      const initialDelay = Math.random() * 10000 + 5000 + (index * 15000); // Décaler de 15s entre chaque bot
      console.log(`⏳ Premier bump ${bot.name} dans ${channelId} dans ${Math.round(initialDelay / 1000)} secondes...`);
      
      setTimeout(() => {
        bumpBot(bot);
      }, initialDelay);
    });
  });

  // Gestion des erreurs de connexion
  selfbot.on('error', error => {
    console.error(`❌ Erreur client selfbot pour ${channelId}:`, error.message);
  });

  selfbot.on('disconnect', () => {
    console.log(`⚠️ Selfbot déconnecté pour ${channelId}`);
  });

  console.log(`🚀 Démarrage de l'auto-bump pour ${channelId}...`);
  selfbot.login(userToken).catch(error => {
    console.error(`❌ Erreur de connexion selfbot pour ${channelId}:`, error.message);
    delete global.activeBumps[channelId];
  });
}
