const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const https = require('https');

// API Key Tenor (clé publique de démo)
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';

// Thèmes populaires pour l'autocomplétion
const POPULAR_THEMES = [
  'random',
  'français',
  'funny',
  'cat',
  'dog',
  'happy',
  'sad',
  'love',
  'dance',
  'anime',
  'meme',
  'excited',
  'angry',
  'shocked',
  'thumbs up',
  'fail',
  'party',
  'wtf',
  'omg',
  'yes',
  'no'
];

module.exports = {
  name: 'randomgif',
  description: 'Envoie un GIF aléatoire',
  category: 'fun',
  data: new SlashCommandBuilder()
    .setName('randomgif')
    .setDescription('Envoie un GIF aléatoire')
    .addStringOption(option =>
      option.setName('theme')
        .setDescription('Thème du GIF (optionnel)')
        .setRequired(false)
        .setAutocomplete(true)),
  options: [],

  executeSlash: async (interaction) => {
    try {
      await interaction.deferReply();

      const theme = interaction.options.getString('theme') || '';
      
      // Déterminer si on doit utiliser le locale français
      const isFrench = theme && theme.toLowerCase() === 'français';
      const localeParam = isFrench ? '&locale=fr_FR&country=FR' : '';
      
      // Construire l'URL de l'API
      let apiUrl;
      if (theme && theme.trim() !== '' && theme.toLowerCase() !== 'random') {
        // Recherche avec thème (ou trending français si thème = français)
        const searchTerm = isFrench ? '' : encodeURIComponent(theme);
        if (isFrench) {
          // Pour français, utiliser trending avec locale FR
          apiUrl = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=50&media_filter=gif&contentfilter=medium${localeParam}`;
        } else {
          apiUrl = `https://tenor.googleapis.com/v2/search?q=${searchTerm}&key=${TENOR_API_KEY}&limit=50&media_filter=gif&contentfilter=medium${localeParam}`;
        }
      } else {
        // GIF complètement aléatoire via trending
        apiUrl = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=50&media_filter=gif&contentfilter=medium${localeParam}`;
      }

      // Faire la requête à l'API Tenor
      https.get(apiUrl, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', async () => {
          try {
            const response = JSON.parse(data);
            
            if (!response.results || response.results.length === 0) {
              const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Aucun GIF trouvé')
                .setDescription(theme ? `Aucun GIF trouvé pour le thème "${theme}".` : 'Aucun GIF disponible pour le moment.')
                .setTimestamp();
              
              return interaction.editReply({ embeds: [embed] });
            }

            // Sélectionner un GIF aléatoire dans les résultats
            const randomIndex = Math.floor(Math.random() * response.results.length);
            const gif = response.results[randomIndex];
            
            // URL du GIF
            const gifUrl = gif.media_formats?.gif?.url || gif.itemurl;
            
            // Créer l'embed
            const displayTheme = theme.toLowerCase() === 'français' ? '🇫🇷 GIF en Français' : (theme ? `🎬 GIF : ${theme}` : '🎬 GIF Aléatoire');
            const embed = new EmbedBuilder()
              .setColor('#00D9FF')
              .setTitle(displayTheme)
              .setImage(gifUrl)
              .setFooter({ text: 'Powered by Tenor' })
              .setTimestamp();

            // Ajouter le titre du GIF s'il existe
            if (gif.content_description) {
              embed.setDescription(gif.content_description);
            }

            await interaction.editReply({ embeds: [embed] });

          } catch (error) {
            console.error('Erreur lors du parsing de la réponse Tenor:', error);
            
            const embed = new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ Erreur')
              .setDescription('Une erreur est survenue lors de la récupération du GIF.')
              .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
          }
        });

      }).on('error', async (error) => {
        console.error('Erreur lors de la requête à Tenor:', error);
        
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Erreur de connexion')
          .setDescription('Impossible de se connecter à l\'API Tenor.')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      });

    } catch (error) {
      console.error('Erreur lors de l\'exécution de /randomgif:', error);
      
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
        .setTimestamp();
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },

  // Gérer l'autocomplétion
  autocomplete: async (interaction) => {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    // Filtrer les thèmes selon ce que l'utilisateur tape
    const filtered = POPULAR_THEMES
      .filter(theme => theme.toLowerCase().includes(focusedValue))
      .slice(0, 25); // Discord limite à 25 suggestions
    
    await interaction.respond(
      filtered.map(theme => ({
        name: theme.charAt(0).toUpperCase() + theme.slice(1),
        value: theme
      }))
    );
  }
};
