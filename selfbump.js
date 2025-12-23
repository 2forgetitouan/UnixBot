require('dotenv').config()
const { Client } = require('discord.js-selfbot-v13')
const client = new Client({
    checkUpdate: false,
    ws: {
        properties: {
            browser: 'Discord Client'
        }
    }
})

let isRunning = {}
let nextBumpTimes = {}
let failureCounts = {}
const MAX_FAILURES = 5

// Configuration des bots de bump avec leurs intervalles personnalisés
const BUMP_BOTS = [
    { 
        id: '302050872383242240', 
        name: 'Disboard',
        minDelay: 7200000,  // 2h
        maxDelay: 11100000  // 3h05
    },
    { 
        id: '678211574183362571', 
        name: 'Discord Invite',
        minDelay: 14400000, // 4h
        maxDelay: 18300000  // 5h05
    }
]

// Initialiser les états pour chaque bot
BUMP_BOTS.forEach(bot => {
    isRunning[bot.id] = false
    nextBumpTimes[bot.id] = null
    failureCounts[bot.id] = 0
})

// Fonction pour générer un délai aléatoire personnalisé par bot
function getRandomDelay(bot) {
    const baseDelay = Math.random() * (bot.maxDelay - bot.minDelay) + bot.minDelay
    
    // Ajoute une variance supplémentaire basée sur l'heure de la journée
    const hour = new Date().getHours()
    const variance = (hour >= 2 && hour <= 7) ? 1.15 : 1.0 // Plus long la nuit
    
    return Math.round(baseDelay * variance)
}

// Fonction pour attendre un délai aléatoire court (simule comportement humain)
function randomHumanDelay(min = 1000, max = 3000) {
    return new Promise(resolve => 
        setTimeout(resolve, Math.random() * (max - min) + min)
    )
}

client.on('ready', async () => {
    console.log(`[${new Date().toLocaleString()}] Connecté en tant que ${client.user.tag}`)
    
    let channel
    try {
        channel = await client.channels.fetch(process.env.BUMP_CHANNEL)
        if (!channel) {
            console.error('❌ Salon introuvable')
            process.exit(1)
        }
        console.log(`✓ Salon trouvé: ${channel.name || channel.id}`)
    } catch (error) {
        console.error('❌ Erreur lors de la récupération du salon:', error.message)
        process.exit(1)
    }
    
    async function bumpBot(bot) {
        if (isRunning[bot.id]) {
            console.log(`⏳ Un bump ${bot.name} est déjà en cours...`)
            return
        }
        
        isRunning[bot.id] = true
        
        try {
            // Délai aléatoire avant d'envoyer (simule lecture/réflexion)
            await randomHumanDelay(2000, 5000)
            
            console.log(`[${new Date().toLocaleString()}] 📤 Envoi du bump ${bot.name}...`)
            await channel.sendSlash(bot.id, 'bump')
            
            failureCounts[bot.id] = 0 // Reset en cas de succès
            console.log(`✓ Bump ${bot.name} envoyé avec succès!`)
            
            // Attendre un peu avant de programmer le prochain
            await randomHumanDelay(1000, 2000)
            
        } catch (error) {
            failureCounts[bot.id]++
            console.error(`❌ Erreur lors du bump ${bot.name} (tentative ${failureCounts[bot.id]}/${MAX_FAILURES}):`, error.message)
            
            if (failureCounts[bot.id] >= MAX_FAILURES) {
                console.error(`💥 Trop d'échecs consécutifs pour ${bot.name}. Désactivation de ce bot.`)
                return
            }
            
            // En cas d'erreur, réessayer avec un délai plus court
            const retryDelay = 60000 * failureCounts[bot.id] // 1min, 2min, 3min...
            console.log(`⏰ Nouvelle tentative ${bot.name} dans ${retryDelay / 60000} minute(s)`)
            setTimeout(() => {
                isRunning[bot.id] = false
                bumpBot(bot)
            }, retryDelay)
            return
        } finally {
            isRunning[bot.id] = false
        }
        
        scheduleNextBump(bot)
    }

    function scheduleNextBump(bot) {
        const delay = getRandomDelay(bot)
        nextBumpTimes[bot.id] = new Date(Date.now() + delay)
        
        const hours = Math.floor(delay / 3600000)
        const minutes = Math.floor((delay % 3600000) / 60000)
        
        console.log(`⏰ Prochain bump ${bot.name} prévu à: ${nextBumpTimes[bot.id].toLocaleString()} (dans ${hours}h${minutes}min)`)
        
        setTimeout(() => {
            bumpBot(bot)
        }, delay)
    }
    
    // Démarrage initial pour chaque bot avec des délais aléatoires décalés
    BUMP_BOTS.forEach((bot, index) => {
        const initialDelay = Math.random() * 10000 + 5000 + (index * 15000) // Décaler de 15s entre chaque bot
        console.log(`⏳ Premier bump ${bot.name} dans ${Math.round(initialDelay / 1000)} secondes...`)
        
        setTimeout(() => {
            bumpBot(bot)
        }, initialDelay)
    })
})

// Gestion des erreurs de connexion
client.on('error', error => {
    console.error('❌ Erreur client:', error.message)
})

client.on('disconnect', () => {
    console.log('⚠️ Déconnecté de Discord')
})

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\n👋 Arrêt du bot...')
    client.destroy()
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log('\n👋 Arrêt du bot...')
    client.destroy()
    process.exit(0)
})

console.log('🚀 Démarrage du bot...')
client.login(process.env.TOKEN).catch(error => {
    console.error('❌ Erreur de connexion:', error.message)
    process.exit(1)
})
