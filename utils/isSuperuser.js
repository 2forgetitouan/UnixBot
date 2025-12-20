const fs = require('fs');
const path = require('path');

function getSuperusers() {
  const superuserPath = path.join(__dirname, '../config/superuser.json');
  if (!fs.existsSync(superuserPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(superuserPath, 'utf8'));
  } catch {
    return [];
  }
}

function isSuperuser(username) {
  const superusers = getSuperusers();
  return superusers.includes(username);
}

module.exports = { isSuperuser, getSuperusers };