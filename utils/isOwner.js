const fs = require('fs');
const path = require('path');

function getOwners() {
  const ownersPath = path.join(__dirname, '../config/owners.json');
  if (!fs.existsSync(ownersPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(ownersPath, 'utf8'));
  } catch {
    return [];
  }
}

function isOwner(username) {
  const owners = getOwners();
  return owners.includes(username);
}

function addOwner(username) {
  const ownersPath = path.join(__dirname, '../config/owners.json');
  let owners = getOwners();
  if (!owners.includes(username)) {
    owners.push(username);
    fs.writeFileSync(ownersPath, JSON.stringify(owners, null, 2));
  }
}

function removeOwner(username) {
  const ownersPath = path.join(__dirname, '../config/owners.json');
  let owners = getOwners();
  owners = owners.filter(u => u !== username);
  fs.writeFileSync(ownersPath, JSON.stringify(owners, null, 2));
}

module.exports = { isOwner, addOwner, removeOwner, getOwners };