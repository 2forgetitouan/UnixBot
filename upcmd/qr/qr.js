const { SlashCommandBuilder } = require('discord.js');
const QRCode = require('qrcode');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'qr',
  description: 'Génère un QR code à partir d\'un texte ou d\'un lien.',
  category: 'utils',
  data: new SlashCommandBuilder()
    .setName('qr')
    .setDescription('Génère un QR code à partir d\'un texte ou d\'un lien')
    .addStringOption(option =>
      option.setName('texte')
        .setDescription('Texte ou lien à transformer en QR code')
        .setRequired(true)
    ),
  options: [
    {
      name: 'texte',
      description: 'Texte ou lien à transformer en QR code',
      type: 3, // STRING
      required: true
    }
  ],
  execute: async (message, args, client) => {
    const texte = args.join(' ');
    if (!texte) {
      return message.reply({ content: '⚠️ Un texte ou un lien est requis.' });
    }

    try {
      const qrData = await QRCode.toDataURL(texte);
      const base64Data = qrData.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const file = new AttachmentBuilder(buffer, { name: 'qrcode.png' });
      await message.reply({ content: `🎉 Voici ton QR pour : \`${texte}\``, files: [file] });
    } catch (err) {
      console.error(err);
      await message.reply({ content: '❌ Erreur lors de la génération du QR code.' });
    }
  },
  executeSlash: async (interaction) => {
    const texte = interaction.options.getString('texte');
    if (!texte) {
      return interaction.reply({ content: '⚠️ Un texte ou un lien est requis.', ephemeral: true });
    }

    try {
      const qrData = await QRCode.toDataURL(texte);
      const base64Data = qrData.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const file = new AttachmentBuilder(buffer, { name: 'qrcode.png' });
      await interaction.reply({ content: `🎉 Voici ton QR pour : \`${texte}\``, files: [file] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ Erreur lors de la génération du QR code.', ephemeral: true });
    }
  }
};
