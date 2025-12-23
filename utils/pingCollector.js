/**
 * Module de collecte de ping en temps réel
 * Enregistre les données de latence dans un fichier JSON persistant
 * Fonctionne indépendamment du bot et conserve l'historique même après redémarrage
 */

const fs = require('fs');
const path = require('path');

const PING_DATA_FILE = path.join(__dirname, '../config/pingHistory.json');
const MAX_DATA_POINTS = 2880; // 24h de données avec 30s d'intervalle, ou 48h avec 1min d'intervalle
const COLLECT_INTERVAL = 30000; // Collecter toutes les 30 secondes

let collectorInterval = null;
let botClient = null;

/**
 * Charge les données de ping depuis le fichier
 */
function loadPingData() {
  try {
    if (fs.existsSync(PING_DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(PING_DATA_FILE, 'utf8'));
      return data;
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données de ping:', error);
  }
  return {
    history: [],
    startTime: Date.now(),
    lastUpdate: null
  };
}

/**
 * Sauvegarde les données de ping dans le fichier
 */
function savePingData(data) {
  try {
    // S'assurer que le dossier config existe
    const configDir = path.dirname(PING_DATA_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(PING_DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données de ping:', error);
  }
}

/**
 * Ajoute un point de données de ping
 */
function addPingDataPoint(ping, status = 'online') {
  const data = loadPingData();
  
  const dataPoint = {
    timestamp: Date.now(),
    ping: ping,
    status: status // 'online', 'offline', 'starting'
  };
  
  data.history.push(dataPoint);
  data.lastUpdate = Date.now();
  
  // Limiter le nombre de points de données
  if (data.history.length > MAX_DATA_POINTS) {
    data.history = data.history.slice(-MAX_DATA_POINTS);
  }
  
  savePingData(data);
  return dataPoint;
}

/**
 * Marque le bot comme hors ligne
 */
function markOffline() {
  addPingDataPoint(-1, 'offline');
}

/**
 * Marque le bot comme en cours de démarrage
 */
function markStarting() {
  addPingDataPoint(0, 'starting');
}

/**
 * Récupère les données de ping pour une période donnée
 * @param {number} duration - Durée en secondes (ex: 3600 pour 1h, 86400 pour 24h)
 */
function getPingHistory(duration = 86400) {
  const data = loadPingData();
  const now = Date.now();
  const cutoff = now - (duration * 1000);
  
  return {
    history: data.history.filter(point => point.timestamp >= cutoff),
    startTime: data.startTime,
    lastUpdate: data.lastUpdate
  };
}

/**
 * Récupère les statistiques de ping
 */
function getPingStats() {
  const data = loadPingData();
  const onlinePoints = data.history.filter(p => p.status === 'online' && p.ping > 0);
  
  if (onlinePoints.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      current: 0,
      uptime: 0,
      totalPoints: 0
    };
  }
  
  const pings = onlinePoints.map(p => p.ping);
  const sum = pings.reduce((a, b) => a + b, 0);
  
  // Calculer l'uptime (pourcentage de temps en ligne)
  const totalPoints = data.history.length;
  const onlineCount = onlinePoints.length;
  const uptimePercent = totalPoints > 0 ? (onlineCount / totalPoints) * 100 : 0;
  
  return {
    average: Math.round(sum / pings.length),
    min: Math.min(...pings),
    max: Math.max(...pings),
    current: pings[pings.length - 1] || 0,
    uptime: uptimePercent.toFixed(2),
    totalPoints: totalPoints
  };
}

/**
 * Collecte le ping actuel du bot
 */
function collectPing() {
  if (!botClient || !botClient.ws) {
    return;
  }
  
  const ping = botClient.ws.ping;
  
  if (ping && ping > 0) {
    addPingDataPoint(ping, 'online');
  } else if (ping === -1) {
    addPingDataPoint(-1, 'offline');
  }
}

/**
 * Démarre le collecteur de ping
 * @param {Client} client - Le client Discord.js
 */
function startCollector(client) {
  if (collectorInterval) {
    console.log('⚠️  Le collecteur de ping est déjà en cours d\'exécution.');
    return;
  }
  
  botClient = client;
  
  // Marquer le démarrage
  markStarting();
  
  // Attendre que le client soit prêt avant de collecter
  if (client.isReady()) {
    collectPing();
  } else {
    client.once('ready', () => {
      collectPing();
    });
  }
  
  // Démarrer la collecte périodique
  collectorInterval = setInterval(() => {
    if (botClient && botClient.isReady()) {
      collectPing();
    }
  }, COLLECT_INTERVAL);
  
  console.log('📊 Collecteur de ping démarré (intervalle: 30s)');
}

/**
 * Arrête le collecteur de ping
 */
function stopCollector() {
  if (collectorInterval) {
    clearInterval(collectorInterval);
    collectorInterval = null;
    markOffline();
    console.log('📊 Collecteur de ping arrêté');
  }
}

/**
 * Réinitialise les données de ping (à utiliser avec précaution)
 */
function resetPingData() {
  const data = {
    history: [],
    startTime: Date.now(),
    lastUpdate: null
  };
  savePingData(data);
  console.log('📊 Données de ping réinitialisées');
}

module.exports = {
  startCollector,
  stopCollector,
  getPingHistory,
  getPingStats,
  addPingDataPoint,
  markOffline,
  markStarting,
  resetPingData,
  loadPingData,
  COLLECT_INTERVAL,
  MAX_DATA_POINTS
};
