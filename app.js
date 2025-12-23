const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const crypto = require('crypto');
const app = express();
const config = require('./config/config.json');
const { client } = require('./bot');
const { getLogs, log } = require('./utils/logger');
const { isOwner } = require('./utils/isOwner');
const { isSuperuser } = require('./utils/isSuperuser');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Destination du MP pour les tentatives de connexion
const contactUserId = config.contactUserId || process.env.CONTACT_USER_ID || '';

// Sessions sécurisées et persistantes
const sessionSecret = (config.sessionSecret && config.sessionSecret.length > 0)
  ? config.sessionSecret
  : crypto.randomBytes(32).toString('hex');
app.use(session({
  name: 'unixbot.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: new FileStore({
    path: './sessions',
    retries: 0,
    ttl: 30 * 24 * 60 * 60 // 30 jours
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
  }
}));

// Injecter l'utilisateur dans les vues
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

const publicPaths = [
  '/auth/login',
  '/auth/discord',
  '/auth/callback',
  '/auth/logout',
  '/favicon.png'
];

function isStaticAsset(reqPath) {
  return reqPath.startsWith('/css/')
    || reqPath.startsWith('/js/')
    || reqPath.startsWith('/img/')
    || reqPath.startsWith('/favicons/')
    || reqPath.startsWith('/public/');
}

function ensureAuth(req, res, next) {
  if (publicPaths.includes(req.path) || isStaticAsset(req.path)) return next();
  if (req.session?.user?.allowed) return next();
  return res.redirect('/auth/login');
}

// Appliquer l'auth sur tout sauf les routes publiques/actifs statiques
app.use(ensureAuth);

// Ajouter cette ligne avant les autres middlewares
app.use('/favicon.png', express.static(path.join(__dirname, 'web/public/favicon.png')));

app.post('/move-command', (req, res) => {
  const { command, from, to } = req.body;

  // Vérifie que les paramètres sont valides
  if (!command || !from || !to) {
    return res.status(400).json({
      success: false,
      message: "Paramètres manquants : command, from ou to."
    });
  }

  // Correction ici : on ne rajoute pas "cmd"
  const fromDir = path.join(__dirname, from, command);
  const toDir = path.join(__dirname, to, command);

  console.log(`Tentative de déplacement de ${fromDir} vers ${toDir}`); // Log pour débogage

  try {
    // Vérifie que la commande existe dans le dossier source
    if (!fs.existsSync(fromDir)) {
      return res.status(404).json({
        success: false,
        message: `La commande "${command}" n'existe pas dans "${from}".`
      });
    }

    // Vérifie que le dossier de destination existe, sinon le crée
    const toParentDir = path.join(__dirname, to);
    if (!fs.existsSync(toParentDir)) {
      fs.mkdirSync(toParentDir, { recursive: true });
    }

    // Vérifie si la commande existe déjà dans le dossier de destination
    if (fs.existsSync(toDir)) {
      return res.status(409).json({
        success: false,
        message: `La commande "${command}" existe déjà dans "${to}".`
      });
    }

    // Empêcher la désactivation des commandes par défaut
    if (from === 'defaultcmd') {
      return res.status(403).json({
        success: false,
        message: "Les commandes par défaut ne peuvent pas être désactivées."
      });
    }

    // Déplace la commande
    fs.renameSync(fromDir, toDir);

    // Crée un flag pour recharger les commandes
    fs.writeFileSync(path.join(__dirname, 'config/reload_flag'), 'reload');
    log('MOVE', `Commande "${command}" déplacée de "${from}" vers "${to}"`, { user: getClientIp(req) });

    res.json({
      success: true,
      message: `Commande "${command}" déplacée avec succès.`
    });
  } catch (error) {
    log('ERROR', `Erreur move-command: ${error.message}`, { user: getClientIp(req) });
    console.error("Erreur détaillée :", error); // Log l'erreur complète
    res.status(500).json({
      success: false,
      message: `Erreur lors du déplacement : ${error.message}`
    });
  }
});

const ejs = require('ejs');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'web/views'));
app.use(express.static(path.join(__dirname, 'web/public')));

const protectedRoutes = [
  '/',
  '/giveaways-page',
  '/commands',
  '/logs',
  '/giveaways',
  '/giveaway',
  '/giveaway/:messageId',
  '/bot-status',
  '/bot-start',
  '/bot-stop',
  '/bot-restart',
  '/move-command'
];

app.use(protectedRoutes, ensureAuth);

function formatUsername(user) {
  if (!user) return '';
  if (user.discriminator === '0' || user.discriminator === '0000') {
    return user.username;
  }
  return `${user.username}#${user.discriminator}`;
}

function sanitizeIp(ip) {
  if (!ip) return 'Inconnue';
  // Retire le préfixe IPv6 des IP v4 encodées
  return ip.replace(/^::ffff:/, '').trim();
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || req.headers['x-real-ip'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    if (first) return sanitizeIp(first);
  }
  return sanitizeIp(req.ip || '');
}

function getAvatarUrl(user) {
  if (!user) return '';
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
  }
  const discrim = user.discriminator === '0' ? 0 : Number(user.discriminator) || 0;
  const index = discrim % 5;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

async function notifyAuthAttempt({ req, user, status, reason }) {
  if (!contactUserId || !client || !client.user) return;
  try {
    const target = await client.users.fetch(contactUserId);
    const ip = getClientIp(req);
    const username = user ? formatUsername(user) : 'Inconnu';
    const mention = user?.id ? `<@${user.id}>` : 'Inconnu';
    const avatar = user ? getAvatarUrl(user) : '';
    const avatarLine = avatar ? `Avatar : [Lien de l'avatar](${avatar})` : 'Avatar : Non disponible';
    const details = [
      `Statut : ${status}`,
      `Pseudo : ${username}`,
      `Mention : ${mention}`,
      `IP : ${ip}`,
      avatarLine,
      `Raison : ${reason || 'Aucune'}`
    ].join('\n');
    await target.send(`Tentative de connexion UnixBot\n${details}`);
  } catch (err) {
    console.error("Impossible d'envoyer le MP de connexion:", err?.message || err);
  }
}

app.get('/auth/login', (req, res) => {
  // Si l'utilisateur est déjà connecté, le rediriger vers la page d'accueil
  if (req.session?.user?.allowed) {
    return res.redirect('/');
  }
  return res.render('login');
});

app.get('/auth/discord', (req, res) => {
  const clientId = config.oauth?.clientId || process.env.DISCORD_CLIENT_ID;
  const redirectUri = config.oauth?.redirectUri || process.env.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/callback`;
  if (!clientId) {
    return res.status(500).send('Configuration OAuth manquante (clientId).');
  }

  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  req.session.redirectTo = req.query.redirect || '/';

  const authorizeUrl = new URL('https://discord.com/oauth2/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'identify');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('prompt', 'none');
  res.redirect(authorizeUrl.toString());
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.oauthState) {
      const reason = 'Code ou état invalide.';
      await notifyAuthAttempt({ req, user: null, status: 'erreur', reason });
      return res.status(400).render('auth-error', { title: 'Connexion échouée', reason });
    }

    const clientId = config.oauth?.clientId || process.env.DISCORD_CLIENT_ID;
    const clientSecret = config.oauth?.clientSecret || process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = config.oauth?.redirectUri || process.env.DISCORD_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/callback`;

    if (!clientId || !clientSecret) {
      const reason = 'Configuration OAuth manquante (client id/secret).';
      await notifyAuthAttempt({ req, user: null, status: 'erreur', reason });
      return res.status(500).render('auth-error', { title: 'Connexion échouée', reason });
    }

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenRes.ok) {
      const reason = "Echec d'authentification Discord.";
      console.error('Erreur token OAuth:', await tokenRes.text());
      await notifyAuthAttempt({ req, user: null, status: 'erreur', reason });
      return res.status(500).render('auth-error', { title: 'Connexion échouée', reason });
    }

    const tokenData = await tokenRes.json();

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `${tokenData.token_type} ${tokenData.access_token}` }
    });

    if (!userRes.ok) {
      const reason = 'Impossible de récupérer le profil Discord.';
      console.error('Erreur fetch user OAuth:', await userRes.text());
      await notifyAuthAttempt({ req, user: null, status: 'erreur', reason });
      return res.status(500).render('auth-error', { title: 'Connexion échouée', reason });
    }

    const user = await userRes.json();
    const userTag = formatUsername(user);
    const allowed = isOwner(userTag) || isSuperuser(userTag);

    if (!allowed) {
      const reason = 'Accès refusé : vous n’avez pas les permissions nécessaires pour continuer.';
      await notifyAuthAttempt({ req, user, status: 'refusé', reason });
      req.session.destroy(() => {});
      return res.status(403).render('auth-error', { title: 'Accès refusé', reason });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      tag: userTag,
      avatar: user.avatar,
      allowed: true
    };
    req.session.loginTime = new Date();

    await notifyAuthAttempt({ req, user, status: 'succès', reason: 'Authentification réussie.' });

    const redirectTo = req.session.redirectTo || '/';
    delete req.session.redirectTo;
    res.redirect(redirectTo);
  } catch (err) {
    console.error('Erreur callback OAuth:', err);
    const reason = 'Erreur lors du callback OAuth.';
    await notifyAuthAttempt({ req, user: null, status: 'erreur', reason });
    res.status(500).render('auth-error', { title: 'Connexion échouée', reason });
  }
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

app.get('/', (req, res) => {
  const upcmdDir = path.join(__dirname, 'upcmd');
  const downcmdDir = path.join(__dirname, 'downcmd');
  const defaultcmdDir = path.join(__dirname, 'defaultcmd');
  const upcmd = fs.existsSync(upcmdDir) ? fs.readdirSync(upcmdDir) : [];
  const downcmd = fs.existsSync(downcmdDir) ? fs.readdirSync(downcmdDir) : [];
  const defaultcmd = fs.existsSync(defaultcmdDir) ? fs.readdirSync(defaultcmdDir) : [];

  // Pour les zones drag & drop, on ne veut PAS les commandes par défaut
  const upcmdDisplay = upcmd.filter(cmd => !defaultcmd.includes(cmd));
  const downcmdDisplay = downcmd.filter(cmd => !defaultcmd.includes(cmd));

  // Récupérer toutes les commandes avec infos
  const allCommands = [];

  // Commandes actives (hors par défaut)
  upcmd.forEach(cmd => {
    const infoPath = path.join(upcmdDir, cmd, 'infos.json');
    let info = { name: cmd, description: '', category: '', status: 'Active' };
    if (fs.existsSync(infoPath)) {
      try {
        info = { ...JSON.parse(fs.readFileSync(infoPath, 'utf8')), status: 'Active' };
      } catch {}
    }
    allCommands.push(info);
  });

  // Commandes désactivées (hors par défaut)
  downcmd.forEach(cmd => {
    if (!defaultcmd.includes(cmd)) {
      const infoPath = path.join(downcmdDir, cmd, 'infos.json');
      let info = { name: cmd, description: '', category: '', status: 'Désactivée' };
      if (fs.existsSync(infoPath)) {
        try {
          info = { ...JSON.parse(fs.readFileSync(infoPath, 'utf8')), status: 'Désactivée' };
        } catch {}
      }
      allCommands.push(info);
    }
  });

  // Commandes par défaut (toujours actives)
  defaultcmd.forEach(cmd => {
    const infoPath = path.join(defaultcmdDir, cmd, 'infos.json');
    let info = { name: cmd, description: '', category: '', status: 'Par défaut' };
    if (fs.existsSync(infoPath)) {
      try {
        info = { ...JSON.parse(fs.readFileSync(infoPath, 'utf8')), status: 'Par défaut' };
      } catch {}
    }
    allCommands.push(info);
  });

  res.render('index', { upcmd: upcmdDisplay, downcmd: downcmdDisplay, defaultcmd, allCommands });
});

app.get('/giveaways-page', (req, res) => {
  res.render('giveaways');
});

app.get('/logs', (req, res) => {
  const logs = getLogs(100);
  res.json(logs);
});

app.get('/commands', (req, res) => {
  const upcmdDir = path.join(__dirname, 'upcmd');
  const downcmdDir = path.join(__dirname, 'downcmd');
  const defaultcmdDir = path.join(__dirname, 'defaultcmd');
  const upcmd = fs.existsSync(upcmdDir) ? fs.readdirSync(upcmdDir) : [];
  const downcmd = fs.existsSync(downcmdDir) ? fs.readdirSync(downcmdDir) : [];
  const defaultcmd = fs.existsSync(defaultcmdDir) ? fs.readdirSync(defaultcmdDir) : [];

  const allCommands = [];

  // Commandes actives
  upcmd.forEach(cmd => {
    const infoPath = path.join(upcmdDir, cmd, 'infos.json');
    let info = { name: cmd, description: '', category: '', status: 'Active' };
    if (fs.existsSync(infoPath)) {
      try {
        info = { ...JSON.parse(fs.readFileSync(infoPath, 'utf8')), status: 'Active' };
      } catch {}
    }
    allCommands.push(info);
  });

  // Commandes désactivées
  downcmd.forEach(cmd => {
    if (!defaultcmd.includes(cmd)) {
      const infoPath = path.join(downcmdDir, cmd, 'infos.json');
      let info = { name: cmd, description: '', category: '', status: 'Désactivée' };
      if (fs.existsSync(infoPath)) {
        try {
          info = { ...JSON.parse(fs.readFileSync(infoPath, 'utf8')), status: 'Désactivée' };
        } catch {}
      }
      allCommands.push(info);
    }
  });

  // Commandes par défaut
  defaultcmd.forEach(cmd => {
    const infoPath = path.join(defaultcmdDir, cmd, 'infos.json');
    let info = { name: cmd, description: '', category: '', status: 'Par défaut' };
    if (fs.existsSync(infoPath)) {
      try {
        info = { ...JSON.parse(fs.readFileSync(infoPath, 'utf8')), status: 'Par défaut' };
      } catch {}
    }
    allCommands.push(info);
  });

  res.json(allCommands);
});

// Endpoints pour la gestion des giveaways
app.get('/giveaways', async (req, res) => {
  try {
    const giveawaysFile = path.join(__dirname, 'config/giveaways.json');
    
    if (!fs.existsSync(giveawaysFile)) {
      return res.json({ active: [], last: null });
    }

    const data = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
    const bot = require('./bot');
    const client = bot.client;

    const safeFetch = async (label, fetcher) => {
      try {
        return await fetcher();
      } catch (err) {
        // Limiter le bruit des erreurs d'accès manquant
        if (err?.code !== 50001) {
          console.warn(`Fetch ${label} ignoré:`, err?.code || err?.message || err);
        }
        return null;
      }
    };

    // Combiner actifs et terminés
    const allGiveaways = [...(data.active || [])];
    
    // Ajouter le dernier giveaway terminé s'il existe
    if (data.last) {
      allGiveaways.push(data.last);
    }
    
    // Trier par date de fin (plus récents en premier)
    allGiveaways.sort((a, b) => b.endTime - a.endTime);

    // Enrichir les données avec les informations des utilisateurs
    const enrichedGiveaways = await Promise.all(allGiveaways.map(async (g) => {
      try {
        // Vérifier que organizerId existe
        if (!g.organizerId) {
          return {
            ...g,
            organizerName: 'Inconnu',
            channelName: 'Inconnu',
            guildName: 'Inconnu',
            participantsDetails: []
          };
        }

        const organizer = await safeFetch('organizer', () => client.users.fetch(g.organizerId));
        const channel = await safeFetch('channel', () => client.channels.fetch(g.channelId));
        const guild = await safeFetch('guild', () => client.guilds.fetch(g.guildId));
        
        // Récupérer les infos des participants
        const participantsDetails = guild ? await Promise.all((g.participants || []).map(async (pId) => {
          try {
            if (!pId) return null;
            const user = await safeFetch('participantUser', () => client.users.fetch(pId));
            const member = await safeFetch('participantMember', () => guild.members.fetch(pId));
            if (!user) return null;
            return {
              id: user.id,
              username: member?.displayName || user.globalName || user.username,
              tag: user.tag,
              avatar: user.displayAvatarURL(),
              createdAt: user.createdTimestamp,
              joinedAt: member?.joinedTimestamp || null
            };
          } catch {
            return null;
          }
        })) : [];

        return {
          ...g,
          organizerName: organizer?.globalName || organizer?.username || 'Inconnu',
          channelName: channel?.name || 'Inconnu',
          guildName: guild?.name || 'Inconnu',
          participantsDetails: participantsDetails.filter(p => p !== null)
        };
      } catch (err) {
        console.error('Erreur enrichissement giveaway:', err);
        return {
          ...g,
          organizerName: 'Inconnu',
          channelName: 'Inconnu',
          guildName: 'Inconnu',
          participantsDetails: []
        };
      }
    }));

    res.json({ giveaways: enrichedGiveaways });
  } catch (error) {
    console.error('Erreur GET /giveaways:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/giveaway/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const giveawaysFile = path.join(__dirname, 'config/giveaways.json');
    
    if (!fs.existsSync(giveawaysFile)) {
      return res.status(404).json({ success: false, message: 'Aucun giveaway trouvé' });
    }

    const data = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
    const giveaway = (data.active || []).find(g => g.messageId === messageId) ||
      (data.last && data.last.messageId === messageId ? data.last : null);

    if (!giveaway) {
      return res.json({ success: true, message: 'Giveaway déjà supprimé' });
    }

    // Supprimer le message Discord
    const bot = require('./bot');
    const client = bot.client;
    try {
      const channel = await client.channels.fetch(giveaway.channelId);
      const message = await channel.messages.fetch(giveaway.messageId);
      await message.delete();
    } catch (err) {
      console.error('Erreur suppression message:', err);
    }

    // Retirer des giveaways actifs
    data.active = (data.active || []).filter(g => g.messageId !== messageId);
    if (data.last && data.last.messageId === messageId) {
      data.last = null;
    }
    fs.writeFileSync(giveawaysFile, JSON.stringify(data, null, 2));

    // Synchroniser l'état en mémoire du module giveaway
    const giveawayModule = require('./upcmd/giveaway/giveaway.js');
    giveawayModule.loadGiveaways();

    log('DELETE', `Giveaway "${giveaway.prize}" annulé`, { user: getClientIp(req) });
    res.json({ success: true, message: 'Giveaway annulé avec succès' });
  } catch (error) {
    console.error('Erreur DELETE /giveaway:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/giveaway/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { prize, winnersCount, endTime } = req.body;
    const giveawaysFile = path.join(__dirname, 'config/giveaways.json');

    if (!fs.existsSync(giveawaysFile)) {
      return res.status(404).json({ success: false, message: 'Aucun giveaway trouvé' });
    }

    const data = JSON.parse(fs.readFileSync(giveawaysFile, 'utf8'));
    const index = (data.active || []).findIndex(g => g.messageId === messageId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Giveaway non trouvé ou déjà terminé' });
    }

    const updated = { ...data.active[index] };

    if (typeof prize === 'string' && prize.trim().length > 0) {
      updated.prize = prize.trim();
    }

    if (winnersCount !== undefined) {
      const parsedWinners = parseInt(winnersCount, 10);
      if (Number.isNaN(parsedWinners) || parsedWinners < 1) {
        return res.status(400).json({ success: false, message: 'Nombre de gagnants invalide' });
      }
      updated.winnersCount = parsedWinners;
    }

    if (endTime !== undefined) {
      const parsedEnd = parseInt(endTime, 10);
      if (Number.isNaN(parsedEnd)) {
        return res.status(400).json({ success: false, message: 'Date de fin invalide' });
      }
      updated.endTime = parsedEnd;
      updated.ended = false;
    }

    data.active[index] = updated;
    fs.writeFileSync(giveawaysFile, JSON.stringify(data, null, 2));

    const bot = require('./bot');
    const client = bot.client;
    const giveawayModule = require('./upcmd/giveaway/giveaway.js');

  // Mettre à jour l'état en mémoire
  giveawayModule.loadGiveaways();

    // Mettre à jour l'embed et reprogrammer la fin
    await giveawayModule.updateGiveawayEmbed(updated, client);
    giveawayModule.scheduleGiveawayEnd(updated, client);

    log('UPDATE', `Giveaway "${updated.prize}" mis à jour`, { user: getClientIp(req) });
    res.json({ success: true, message: 'Giveaway mis à jour' });
  } catch (error) {
    console.error('Erreur PUT /giveaway:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/bot-status', (req, res) => {
  const bot = require('./bot');
  res.json({ status: bot.getBotStatus() });
});

app.post('/bot-start', (req, res) => {
  const bot = require('./bot');
  bot.startBot()
    .then(() => {
      log('SUCCESS', 'Bot démarré depuis l\'interface web', { user: getClientIp(req) });
      res.json({ success: true, message: 'Bot démarré avec succès' });
    })
    .catch(err => {
      log('ERROR', `Erreur démarrage bot: ${err.message}`, { user: getClientIp(req) });
      res.status(500).json({ success: false, message: err.message });
    });
});

app.post('/bot-stop', (req, res) => {
  const bot = require('./bot');
  bot.stopBot()
    .then(() => {
      log('SUCCESS', 'Bot arrêté depuis l\'interface web', { user: getClientIp(req) });
      res.json({ success: true, message: 'Bot arrêté avec succès' });
    })
    .catch(err => {
      log('ERROR', `Erreur arrêt bot: ${err.message}`, { user: getClientIp(req) });
      res.status(500).json({ success: false, message: err.message });
    });
});

app.post('/bot-restart', (req, res) => {
  const bot = require('./bot');
  bot.restartBot()
    .then(() => {
      log('SUCCESS', 'Bot redémarré depuis l\'interface web', { user: getClientIp(req) });
      res.json({ success: true, message: 'Bot redémarré avec succès' });
    })
    .catch(err => {
      log('ERROR', `Erreur redémarrage bot: ${err.message}`, { user: getClientIp(req) });
      res.status(500).json({ success: false, message: err.message });
    });
});

// Routes admin
app.get('/admin', ensureAuth, (req, res) => {
  if (!req.session.isAdmin) {
    return res.render('admin-login', { error: null });
  }

  // Récupérer toutes les sessions actives depuis les fichiers
  const sessionsPath = path.join(__dirname, 'sessions');
  
  fs.readdir(sessionsPath, (err, files) => {
    if (err) {
      log('ERROR', `Erreur lecture sessions: ${err.message}`, { user: getClientIp(req) });
      return res.render('admin', { sessions: [] });
    }

    const activeSessions = [];
    
    files.filter(f => f.endsWith('.json')).forEach(file => {
      try {
        const sessionFile = fs.readFileSync(path.join(sessionsPath, file), 'utf8');
        const sessionData = JSON.parse(sessionFile);
        
        if (sessionData.user) {
          const sid = file.replace('.json', '');
          activeSessions.push({
            sid,
            id: sessionData.user.id,
            username: sessionData.user.username,
            discriminator: sessionData.user.discriminator,
            avatar: sessionData.user.avatar,
            loginTime: sessionData.loginTime || new Date()
          });
        }
      } catch (parseErr) {
        // Ignorer les fichiers corrompus
      }
    });

    res.render('admin', { sessions: activeSessions });
  });
});

app.post('/admin/login', ensureAuth, (req, res) => {
  const { password } = req.body;
  
  if (password === config.adminPassword) {
    req.session.isAdmin = true;
    log('SUCCESS', 'Connexion admin réussie', { user: getClientIp(req), username: req.session.user.username });
    return res.redirect('/admin');
  }

  log('WARNING', 'Tentative connexion admin échouée', { user: getClientIp(req), username: req.session.user.username });
  res.render('admin-login', { error: 'Mot de passe incorrect' });
});

app.post('/admin/disconnect/:sid', ensureAuth, (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, message: 'Accès refusé' });
  }

  const { sid } = req.params;

  // Supprimer directement le fichier de session
  const sessionFile = path.join(__dirname, 'sessions', `${sid}.json`);
  
  fs.unlink(sessionFile, (err) => {
    if (err && err.code !== 'ENOENT') {
      log('ERROR', `Erreur déconnexion session ${sid}: ${err.message}`, { user: getClientIp(req) });
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }

    log('SUCCESS', `Session ${sid} déconnectée par admin`, { user: getClientIp(req), admin: req.session.user.username });
    res.json({ success: true, message: 'Utilisateur déconnecté' });
  });
});

app.post('/admin/logout', ensureAuth, (req, res) => {
  req.session.isAdmin = false;
  res.redirect('/admin');
});

module.exports = app;
