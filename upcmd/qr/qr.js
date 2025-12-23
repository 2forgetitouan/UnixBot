<<<<<<< HEAD
const { SlashCommandBuilder } = require('discord.js');
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
const QRCode = require('qrcode');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'qr',
<<<<<<< HEAD
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
=======
  description: 'Génère un QR code à partir d’un texte ou d’un lien.',
  category: 'utils',
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
  options: [
    {
      name: 'texte',
      description: 'Texte ou lien à transformer en QR code',
      type: 3, // STRING
      required: true
    }
  ],
<<<<<<< HEAD
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
=======
  execute: async (interaction, args, client) => {
    const texte = args[0];
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
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
