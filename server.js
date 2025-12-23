const config = require('./config/config.json');

// Lancer le serveur web
const app = require('./app');
const port = config.webPort || 3000;
app.listen(port, () => {
  console.log(`Serveur web démarré : http://100.119.24.32:${port}`);
  console.log(`Pour le debug : http://localhost:${port}`);
});

// Charger le bot (qui se démarre automatiquement)
require('./bot');
