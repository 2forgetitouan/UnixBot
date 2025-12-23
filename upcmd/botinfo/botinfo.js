const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const os = require('os');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'botinfo',
  description: 'Affiche toutes les informations détaillées du bot',
  category: 'infos',
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Affiche toutes les informations détaillées du bot'),
  options: [],

  execute: async (message, args, client) => {
    try {
      await sendBotInfo(message, client, false);
    } catch (error) {
      console.error('Erreur dans botinfo:', error);
      await message.reply('Une erreur est survenue lors de la récupération des informations.');
    }
  },

  executeSlash: async (interaction) => {
    try {
      await sendBotInfo(interaction, interaction.client, true);
    } catch (error) {
      console.error('Erreur dans botinfo:', error);
      await interaction.reply({ content: 'Une erreur est survenue lors de la récupération des informations.', ephemeral: true });
    }
  }
};

async function sendBotInfo(context, client, isSlash) {
  // Récupération des informations package.json
  const packagePath = path.join(__dirname, '../../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  // Informations système
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);

  // Mémoire utilisée par le processus Node.js
  const processMemory = process.memoryUsage();
  const heapUsed = (processMemory.heapUsed / 1024 / 1024).toFixed(2);
  const heapTotal = (processMemory.heapTotal / 1024 / 1024).toFixed(2);
  const rss = (processMemory.rss / 1024 / 1024).toFixed(2);
  const external = (processMemory.external / 1024 / 1024).toFixed(2);

  // Temps de fonctionnement
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  const uptimeString = `${days}j ${hours}h ${minutes}m ${seconds}s`;

  // Informations CPU
  const cpus = os.cpus();
  const cpuModel = cpus[0].model;
  const cpuCores = cpus.length;
  const cpuSpeed = cpus[0].speed;

  // Calcul de l'utilisation CPU
  const cpuUsage = cpus.map(cpu => {
    const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
    const idle = cpu.times.idle;
    return ((1 - idle / total) * 100).toFixed(2);
  });
  const avgCpuUsage = (cpuUsage.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / cpuUsage.length).toFixed(2);

  // Informations Discord
  const guilds = client.guilds.cache.size;
  const users = client.users.cache.size;
  const channels = client.channels.cache.size;
  const commands = client.commands.size;

  // Latence
  const wsLatency = client.ws.ping;

  // Informations système d'exploitation
  const platform = os.platform();
  const osType = os.type();
  const osRelease = os.release();
  const osArch = os.arch();
  const hostname = os.hostname();

  // Nombre de threads actifs
  const activeBumps = global.activeBumps || {};
  const activeBumpsCount = Object.keys(activeBumps).length;

  // Compter les commandes par catégorie
  const commandsByCategory = {};
  client.commands.forEach(cmd => {
    const category = cmd.category || 'autre';
    commandsByCategory[category] = (commandsByCategory[category] || 0) + 1;
  });

  // Calculer le nombre de fichiers dans le projet
  let fileCount = 0;
  const countFilesRecursive = (dir) => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          countFilesRecursive(fullPath);
        } else if (stat.isFile()) {
          fileCount++;
        }
      });
    } catch (err) {
      // Ignorer les erreurs de lecture
    }
  };
  countFilesRecursive(path.join(__dirname, '../..'));

  // Emoji pour les indicateurs
  const getMemoryEmoji = (percent) => {
    if (percent < 50) return '🟢';
    if (percent < 75) return '🟡';
    return '🔴';
  };

  const getLatencyEmoji = (ms) => {
    if (ms < 120) return '🟢';
    if (ms < 220) return '🟡';
    return '🔴';
  };

  // Créer l'embed principal
  const embed = new EmbedBuilder()
    .setColor('#53008F')
    .setTitle('📊 Informations Complètes du Bot')
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTimestamp()
    .setFooter({ text: `${packageJson.name} v${packageJson.version} • Par ${packageJson.author}` });

  // Section Bot
  embed.addFields({
    name: '🤖 Informations Bot',
    value: `\`\`\`yaml
Nom: ${client.user.username}
Tag: ${client.user.tag}
ID: ${client.user.id}
Créé le: ${client.user.createdAt.toLocaleDateString('fr-FR')}
Version: ${packageJson.version}
Préfixe: ${require('../../config/config.json').prefix}
\`\`\``,
    inline: false
  });

  // Section Discord
  const categoryList = Object.entries(commandsByCategory)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(' • ');

  embed.addFields({
    name: '📡 Statistiques Discord',
    value: `\`\`\`yaml
Serveurs: ${guilds}
Utilisateurs en cache: ${users}
Salons en cache: ${channels}
Latence WebSocket: ${getLatencyEmoji(wsLatency)} ${wsLatency}ms
Commandes totales: ${commands}
Par catégorie: ${categoryList}
Auto-bumps actifs: ${activeBumpsCount}
\`\`\``,
    inline: false
  });

  // Section Système
  const memEmoji = getMemoryEmoji(memoryUsagePercent);
  embed.addFields({
    name: '💻 Système',
    value: `\`\`\`yaml
OS: ${osType} ${osRelease} (${platform})
Architecture: ${osArch}
Hostname: ${hostname}
CPU: ${cpuModel}
Cœurs: ${cpuCores} @ ${cpuSpeed}MHz
Utilisation CPU: ${avgCpuUsage}%
Mémoire totale: ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB
Mémoire utilisée: ${memEmoji} ${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB (${memoryUsagePercent}%)
Mémoire libre: ${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB
\`\`\``,
    inline: false
  });

  // Section Processus Node.js
  embed.addFields({
    name: '⚙️ Processus Node.js',
    value: `\`\`\`yaml
Version Node.js: ${process.version}
Version Discord.js: ${djsVersion}
PID: ${process.pid}
Heap utilisé: ${heapUsed} MB / ${heapTotal} MB
RSS (Resident Set Size): ${rss} MB
Mémoire externe: ${external} MB
Uptime: ${uptimeString}
Plateforme Node: ${process.platform}
Architecture Node: ${process.arch}
\`\`\``,
    inline: false
  });

  // Section Projet
  embed.addFields({
    name: '📁 Projet',
    value: `\`\`\`yaml
Nom: ${packageJson.name}
Description: ${packageJson.description}
Version: ${packageJson.version}
Auteur: ${packageJson.author}
Licence: ${packageJson.license}
Fichiers dans le projet: ${fileCount}
Script principal: ${packageJson.main}
\`\`\``,
    inline: false
  });

  // Section Dépendances
  const dependencies = Object.entries(packageJson.dependencies || {})
    .map(([name, version]) => `${name}@${version}`)
    .join('\n');

  embed.addFields({
    name: '📦 Dépendances',
    value: `\`\`\`\n${dependencies || 'Aucune'}\n\`\`\``,
    inline: false
  });

  // Section Environnement
  const loadAvg = os.loadavg();
  embed.addFields({
    name: '🌐 Environnement',
    value: `\`\`\`yaml
Charge système (1min): ${loadAvg[0].toFixed(2)}
Charge système (5min): ${loadAvg[1].toFixed(2)}
Charge système (15min): ${loadAvg[2].toFixed(2)}
Répertoire de travail: ${process.cwd()}
Nom d'utilisateur système: ${os.userInfo().username}
Répertoire home: ${os.homedir()}
Répertoire temporaire: ${os.tmpdir()}
\`\`\``,
    inline: false
  });

  // Envoyer la réponse
  if (isSlash) {
    await context.reply({ embeds: [embed] });
  } else {
    await context.reply({ embeds: [embed] });
  }
}
