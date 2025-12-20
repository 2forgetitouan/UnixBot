const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/noarchive.json');

let state = {
  protectedForums: [],
  autoUnarchive: false
};

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      state.protectedForums = Array.isArray(data.protectedForums) ? data.protectedForums : [];
      state.autoUnarchive = Boolean(data.autoUnarchive);
    } else {
      saveConfig();
    }
  } catch (err) {
    console.error('Erreur chargement noarchive config:', err);
  }
  return state;
}

function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Erreur sauvegarde noarchive config:', err);
  }
}

function isForumProtected(forumId) {
  return state.protectedForums.includes(String(forumId));
}

function protectForum(forumId) {
  const id = String(forumId);
  if (!state.protectedForums.includes(id)) {
    state.protectedForums.push(id);
    saveConfig();
  }
}

function allowArchive(forumId) {
  const id = String(forumId);
  state.protectedForums = state.protectedForums.filter(f => f !== id);
  saveConfig();
}

function setAutoUnarchive(enabled) {
  state.autoUnarchive = Boolean(enabled);
  saveConfig();
}

function shouldAutoUnarchive() {
  return state.autoUnarchive;
}

function getState() {
  return { ...state };
}

loadConfig();

module.exports = {
  loadConfig,
  saveConfig,
  isForumProtected,
  protectForum,
  allowArchive,
  setAutoUnarchive,
  shouldAutoUnarchive,
  getState
};
