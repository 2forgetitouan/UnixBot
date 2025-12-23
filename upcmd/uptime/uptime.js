const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const pingCollector = require('../../utils/pingCollector');

module.exports = {
  name: 'uptime',
  description: 'Affiche le temps de fonctionnement du bot avec un graphique visuel',
  category: 'infos',
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Affiche le temps de fonctionnement du bot avec un graphique visuel')
    .addStringOption(option =>
      option.setName('période')
        .setDescription('Période à afficher sur le graphique')
        .setRequired(false)
        .addChoices(
          { name: '1 heure', value: '1h' },
          { name: '6 heures', value: '6h' },
          { name: '24 heures', value: '24h' },
          { name: '7 jours', value: '7d' },
          { name: '30 jours', value: '30d' }
        )),
  options: [],

  execute: async (message, args, client) => {
    try {
      const period = args[0] || '24h';
      await sendUptimeInfo(message, client, false, period);
    } catch (error) {
      console.error('Erreur dans la commande uptime:', error);
      await message.reply('Une erreur est survenue lors de l\'exécution de la commande.');
    }
  },

  executeSlash: async (interaction) => {
    try {
      await interaction.deferReply();
      const period = interaction.options.getString('période') || '24h';
      await sendUptimeInfo(interaction, interaction.client, true, period);
    } catch (error) {
      console.error('Erreur dans la commande uptime:', error);
      await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.' });
    }
  }
};

/**
 * Convertit une période en secondes
 */
function periodToSeconds(period) {
  const periods = {
    '1h': 3600,
    '6h': 6 * 3600,
    '24h': 24 * 3600,
    '7d': 7 * 24 * 3600,
    '30d': 30 * 24 * 3600
  };
  return periods[period] || 24 * 3600;
}

/**
 * Formate une durée en texte lisible
 */
function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  let text = '';
  if (days > 0) text += `${days} jour${days > 1 ? 's' : ''} `;
  if (hours > 0 || days > 0) text += `${hours} heure${hours > 1 ? 's' : ''} `;
  text += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  
  return text.trim();
}

/**
 * Formate un label de temps pour le graphique
 */
function formatTimeLabel(seconds, totalRange) {
  if (totalRange <= 3600) {
    // Moins d'1 heure : afficher en minutes
    return `${Math.floor(seconds / 60)}m`;
  } else if (totalRange <= 86400) {
    // Moins d'1 jour : afficher en heures
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  } else {
    // Plus d'1 jour : afficher en jours
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    return d > 0 ? `${d}j ${h}h` : `${h}h`;
  }
}

async function sendUptimeInfo(context, client, isSlash, period) {
  // Récupérer l'uptime en secondes
  const uptimeSeconds = process.uptime();
  const uptimeText = formatDuration(uptimeSeconds);
  
  // Récupérer la latence actuelle
  const currentPing = client.ws.ping;
  
  // Récupérer les vraies données de ping
  const periodSeconds = periodToSeconds(period);
  const pingHistory = pingCollector.getPingHistory(periodSeconds);
  const pingStats = pingCollector.getPingStats();
  
  // Filtrer les données valides (online uniquement)
  const validData = pingHistory.history.filter(p => p.status === 'online' && p.ping > 0);
  
  // Créer le graphique
  const canvas = createCanvas(1000, 580);
  const ctx = canvas.getContext('2d');
  
  // Fond dégradé violet sombre moderne
  const bgGradient = ctx.createLinearGradient(0, 0, 0, 580);
  bgGradient.addColorStop(0, '#1a0033');
  bgGradient.addColorStop(1, '#0d001a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, 1000, 580);
  
  // Titre principal
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('⏱️ Temps de Fonctionnement & Latence', 500, 40);
  
  // Sous-titre avec l'uptime
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = '#a855f7';
  ctx.fillText(`En ligne depuis: ${uptimeText}`, 500, 65);
  
  // Zone de graphique
  const chartX = 100;
  const chartY = 100;
  const chartWidth = 800;
  const chartHeight = 280;
  
  // Dessiner le cadre du graphique
  ctx.fillStyle = '#2a0052';
  ctx.fillRect(chartX, chartY, chartWidth, chartHeight);
  
  // Calculer les données pour le graphique
  let pingData = [];
  const now = Date.now();
  const startTime = now - (periodSeconds * 1000);
  
  if (validData.length > 0) {
    // Utiliser les vraies données collectées
    // Normaliser les données pour les positionner correctement sur l'axe X
    pingData = validData.map(point => {
      const timeSinceStart = point.timestamp - startTime;
      const x = chartX + (timeSinceStart / (periodSeconds * 1000)) * chartWidth;
      
      // Calculer le max du ping dynamiquement
      const maxPing = Math.max(200, ...validData.map(p => p.ping)) * 1.2;
      const pingNormalized = Math.min(point.ping / maxPing, 1);
      const y = chartY + chartHeight - (pingNormalized * chartHeight);
      
      return { 
        x: Math.max(chartX, Math.min(chartX + chartWidth, x)), 
        y: Math.max(chartY, Math.min(chartY + chartHeight, y)), 
        ping: point.ping, 
        timestamp: point.timestamp 
      };
    });
    
    // Trier par timestamp
    pingData.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  // Calculer le max ping pour l'échelle Y
  const maxPingValue = validData.length > 0 
    ? Math.ceil(Math.max(200, ...validData.map(p => p.ping)) * 1.2 / 50) * 50
    : 500;
  
  // Dessiner la grille horizontale
  ctx.strokeStyle = '#3d0066';
  ctx.lineWidth = 1;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = chartY + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(chartX, y);
    ctx.lineTo(chartX + chartWidth, y);
    ctx.stroke();
    
    // Labels de ping sur l'axe Y
    const pingValue = Math.round(maxPingValue - (maxPingValue / gridLines) * i);
    ctx.fillStyle = '#6b21a8';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${pingValue}ms`, chartX - 10, y + 4);
  }
  
  // Dessiner la grille verticale (temps)
  const timeGridLines = 6;
  for (let i = 0; i <= timeGridLines; i++) {
    const x = chartX + (chartWidth / timeGridLines) * i;
    ctx.strokeStyle = '#3d0066';
    ctx.beginPath();
    ctx.moveTo(x, chartY);
    ctx.lineTo(x, chartY + chartHeight);
    ctx.stroke();
    
    // Labels de temps sur l'axe X
    const timeValue = (periodSeconds / timeGridLines) * i;
    const timeLabel = formatTimeLabel(timeValue, periodSeconds);
    
    ctx.fillStyle = '#6b21a8';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(timeLabel, x, chartY + chartHeight + 18);
  }
  
  if (pingData.length > 1) {
    // Dessiner l'aire sous la courbe avec dégradé violet
    const areaGradient = ctx.createLinearGradient(0, chartY, 0, chartY + chartHeight);
    areaGradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
    areaGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
    areaGradient.addColorStop(1, 'rgba(83, 0, 143, 0.05)');
    
    ctx.fillStyle = areaGradient;
    ctx.beginPath();
    ctx.moveTo(pingData[0].x, chartY + chartHeight);
    ctx.lineTo(pingData[0].x, pingData[0].y);
    
    // Courbe de Bézier pour l'aire
    for (let i = 0; i < pingData.length - 1; i++) {
      const xc = (pingData[i].x + pingData[i + 1].x) / 2;
      const yc = (pingData[i].y + pingData[i + 1].y) / 2;
      ctx.quadraticCurveTo(pingData[i].x, pingData[i].y, xc, yc);
    }
    
    ctx.lineTo(pingData[pingData.length - 1].x, pingData[pingData.length - 1].y);
    ctx.lineTo(pingData[pingData.length - 1].x, chartY + chartHeight);
    ctx.closePath();
    ctx.fill();
    
    // Dessiner la ligne de latence avec effet de lueur violet
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 12;
    
    ctx.beginPath();
    ctx.moveTo(pingData[0].x, pingData[0].y);
    
    // Courbe de Bézier lisse
    for (let i = 0; i < pingData.length - 1; i++) {
      const xc = (pingData[i].x + pingData[i + 1].x) / 2;
      const yc = (pingData[i].y + pingData[i + 1].y) / 2;
      ctx.quadraticCurveTo(pingData[i].x, pingData[i].y, xc, yc);
    }
    
    ctx.lineTo(pingData[pingData.length - 1].x, pingData[pingData.length - 1].y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Point actuel (dernier point)
    const lastPoint = pingData[pingData.length - 1];
    
    // Cercle externe lumineux
    ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Cercle intermédiaire
    ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Point central
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Tooltip pour le ping actuel
    const tooltipX = Math.min(lastPoint.x, chartX + chartWidth - 45);
    const tooltipY = Math.max(lastPoint.y - 50, chartY + 5);
    
    ctx.fillStyle = '#53008F';
    ctx.fillRect(tooltipX - 35, tooltipY, 70, 30);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(tooltipX - 35, tooltipY, 70, 3);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(currentPing)}ms`, tooltipX, tooltipY + 20);
    
  } else {
    // Pas assez de données
    ctx.fillStyle = '#6b21a8';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📊 Collecte des données en cours...', 500, chartY + chartHeight / 2 - 10);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#9333ea';
    ctx.fillText(`${validData.length} point(s) de données collecté(s)`, 500, chartY + chartHeight / 2 + 20);
    ctx.fillText('Les données sont collectées toutes les 30 secondes', 500, chartY + chartHeight / 2 + 45);
  }
  
  // Bordure du graphique
  ctx.strokeStyle = '#53008F';
  ctx.lineWidth = 3;
  ctx.strokeRect(chartX, chartY, chartWidth, chartHeight);
  
  // Labels des axes
  ctx.fillStyle = '#9333ea';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Temps (période: ${period})`, 500, chartY + chartHeight + 38);
  
  ctx.save();
  ctx.translate(45, chartY + chartHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Latence (ms)', 0, 0);
  ctx.restore();
  
  // Statistiques en bas
  const statsY = 430;
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  
  const stats = [
    { label: 'Jours en ligne', value: days, icon: '📅', color: '#a855f7' },
    { label: 'Heures', value: hours, icon: '🕐', color: '#9333ea' },
    { label: 'Minutes', value: minutes, icon: '⏰', color: '#7c3aed' },
    { label: 'Ping actuel', value: `${Math.round(currentPing)}ms`, icon: '📡', color: '#6b21a8' }
  ];
  
  const statWidth = 220;
  const statStartX = 60;
  
  stats.forEach((stat, index) => {
    const x = statStartX + (index * statWidth);
    const y = statsY;
    
    // Rectangle de fond
    ctx.fillStyle = '#2a0052';
    ctx.fillRect(x, y, 200, 60);
    
    // Bordure colorée
    ctx.strokeStyle = stat.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 200, 60);
    
    // Bordure supérieure accentuée
    ctx.fillStyle = stat.color;
    ctx.fillRect(x, y, 200, 4);
    
    // Valeur
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${stat.icon} ${stat.value}`, x + 12, y + 32);
    
    // Label
    ctx.font = '11px Arial';
    ctx.fillStyle = '#a855f7';
    ctx.fillText(stat.label, x + 12, y + 50);
  });
  
  // Statistiques de ping en bas
  const pingStatsY = 510;
  ctx.fillStyle = '#2a0052';
  ctx.fillRect(60, pingStatsY, 880, 55);
  ctx.strokeStyle = '#53008F';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, pingStatsY, 880, 55);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('📊 Statistiques de Latence', 500, pingStatsY + 20);
  
  const statsText = validData.length > 0
    ? `Moy: ${pingStats.average}ms • Min: ${pingStats.min}ms • Max: ${pingStats.max}ms • Points: ${pingStats.totalPoints} • Uptime: ${pingStats.uptime}%`
    : 'En attente de données...';
  
  ctx.font = '13px Arial';
  ctx.fillStyle = '#a855f7';
  ctx.fillText(statsText, 500, pingStatsY + 42);
  
  // Convertir le canvas en buffer
  const buffer = canvas.toBuffer('image/png');
  const attachment = new AttachmentBuilder(buffer, { name: 'uptime.png' });
  
  // Déterminer le statut selon le ping
  const pingStatus = currentPing < 100 ? 'Excellent' : currentPing < 200 ? 'Bon' : currentPing < 300 ? 'Moyen' : 'Élevé';
  const pingEmoji = currentPing < 100 ? '🟢' : currentPing < 200 ? '🟡' : currentPing < 300 ? '🟠' : '🔴';
  
  // Créer l'embed
  const botStartTime = new Date(Date.now() - (uptimeSeconds * 1000));
  const embed = new EmbedBuilder()
    .setColor('#53008F')
    .setTitle('⏱️ Statistiques de Fonctionnement')
    .setDescription(`Le bot est en ligne depuis **${uptimeText}**\n${pingEmoji} Latence actuelle: **${Math.round(currentPing)}ms** (${pingStatus})`)
    .addFields(
      {
        name: '📅 Temps en ligne',
        value: `\`${days}\` jour${days > 1 ? 's' : ''} • \`${hours}\` heure${hours > 1 ? 's' : ''} • \`${minutes}\` minute${minutes > 1 ? 's' : ''}`,
        inline: false
      },
      {
        name: '🚀 Démarré le',
        value: `<t:${Math.floor(botStartTime.getTime() / 1000)}:F>`,
        inline: true
      },
      {
        name: '📊 Période affichée',
        value: period,
        inline: true
      },
      {
        name: '📈 Données collectées',
        value: `\`${validData.length}\` points de mesure`,
        inline: true
      }
    )
    .setImage('attachment://uptime.png')
    .setFooter({ text: 'UnixBot • Données réelles collectées toutes les 30 secondes' })
    .setTimestamp();
  
  // Ajouter les stats de ping si disponibles
  if (validData.length > 0) {
    embed.addFields({
      name: '📡 Statistiques de latence',
      value: `Moyenne: \`${pingStats.average}ms\` • Min: \`${pingStats.min}ms\` • Max: \`${pingStats.max}ms\``,
      inline: false
    });
  }
  
  // Envoyer la réponse
  if (isSlash) {
    await context.editReply({ embeds: [embed], files: [attachment] });
  } else {
    await context.reply({ embeds: [embed], files: [attachment] });
  }
}
