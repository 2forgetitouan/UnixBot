const fs = require('fs');
const path = require('path');

// Script de migration pour ajouter organizerId aux giveaways sans cette propriété

const giveawaysFile = path.join(__dirname, 'config', 'giveaways.json');

if (!fs.existsSync(giveawaysFile)) {
  console.log('❌ Fichier giveaways.json introuvable.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
let modified = false;

// Vous devez fournir l'ID de l'utilisateur par défaut pour les giveaways sans organizerId
// Remplacez 'ID_PAR_DEFAUT' par l'ID Discord du propriétaire du bot
const DEFAULT_ORGANIZER_ID = '1295430635485270098'; // Changez cette valeur si nécessaire

console.log(`📋 Giveaways actifs: ${data.active.length}`);

data.active.forEach((giveaway, index) => {
  if (!giveaway.organizerId) {
    console.log(`⚠️  Giveaway #${index + 1} (${giveaway.prize}) sans organizerId`);
    giveaway.organizerId = DEFAULT_ORGANIZER_ID;
    modified = true;
    console.log(`✅ organizerId ajouté: ${DEFAULT_ORGANIZER_ID}`);
  } else {
    console.log(`✓ Giveaway #${index + 1} (${giveaway.prize}) OK`);
  }
});

if (data.last && !data.last.organizerId) {
  console.log(`⚠️  Dernier giveaway (${data.last.prize}) sans organizerId`);
  data.last.organizerId = DEFAULT_ORGANIZER_ID;
  modified = true;
  console.log(`✅ organizerId ajouté au dernier giveaway`);
}

if (modified) {
  fs.writeFileSync(giveawaysFile, JSON.stringify(data, null, 2));
  console.log('\n✅ Migration terminée ! Le fichier a été mis à jour.');
} else {
  console.log('\n✓ Aucune migration nécessaire. Tous les giveaways ont un organizerId.');
}
