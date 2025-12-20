const QRCode = require('qrcode');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
  name: 'qr',
  description: 'Génère un QR code à partir d’un texte ou d’un lien.',
  category: 'utils',
  options: [
    {
      name: 'texte',
      description: 'Texte ou lien à transformer en QR code',
      type: 3, // STRING
      required: true
    }
  ],
  execute: async (interaction, args, client) => {
    const texte = args[0];
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
