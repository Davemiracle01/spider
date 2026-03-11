const { react01, error01 } = require('../lib/extra');

module.exports = {
  command: ['promote'],
  description: 'Promote a user to admin',
  category: 'Admin Menu',
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from }) {
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
    const target = quotedInfo?.mentionedJid?.[0] || quotedInfo?.participant;

    if (!target) {
      await error01(sock, from, msg.key);
      return sock.sendMessage(from, { text: '❌ Reply to or @mention a user to promote.' }, { quoted: msg });
    }

    try {
      const meta = await sock.groupMetadata(from);
      const targetInfo = meta.participants.find(p => p.id === target);
      if (targetInfo?.admin) {
        return sock.sendMessage(from, {
          text: `ℹ️ @${target.split('@')[0]} is already an admin.`,
          mentions: [target]
        }, { quoted: msg });
      }

      await react01(sock, from, msg.key, 1500);
      await sock.groupParticipantsUpdate(from, [target], 'promote');
      await sock.sendMessage(from, {
        text: `👑 *Promoted!*\n\n@${target.split('@')[0]} is now an admin.`,
        mentions: [target]
      }, { quoted: msg });

    } catch (err) {
      await error01(sock, from, msg.key);
      await sock.sendMessage(from, { text: '❌ Failed to promote. Check my admin rights.' }, { quoted: msg });
    }
  }
};
