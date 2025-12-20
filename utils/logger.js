const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/bot.log');
if (!fs.existsSync(path.dirname(logFile))) fs.mkdirSync(path.dirname(logFile), { recursive: true });

function log(type, message, meta = {}) {
  const now = new Date();
  const time = now.toISOString();
  
  // Format HH:MM:SS pour l'affichage terminal
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const displayTime = `${hours}:${minutes}:${seconds}`;
  
  const entry = { time, type, message, ...meta };
  const line = JSON.stringify(entry);
  fs.appendFileSync(logFile, line + '\n');
  
  // Affiche dans le terminal avec le format court
  console.log(`[${displayTime}] [${type}] ${message}`, meta);
}

function getLogs(limit = 100) {
  if (!fs.existsSync(logFile)) return [];
  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
  return lines.slice(-limit).map(l => {
    try { return JSON.parse(l); } catch { return { time: '', type: 'PARSE_ERROR', message: l }; }
  });
}

module.exports = { log, getLogs };