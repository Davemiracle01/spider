const { react01, error01 } = require('../lib/extra');

module.exports = {
  command: ['demote'],
  description: 'Demote an admin to regular member',
  category: 'Admin Menu',
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from }) {
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
    const target = quotedInfo?.mentionedJid?.[0] || quotedInfo?.participant;

    if (!target) {
      await error01(sock, from, msg.key);
      return sock.sendMessage(from, { text: '❌ Reply to or @mention an admin to demote.' }, { quoted: msg });
    }

    try {
      const meta = await sock.groupMetadata(from);
      const targetInfo = meta.participants.find(p => p.id === target);
      if (!targetInfo?.admin) {
        return sock.sendMessage(from, {
          text: `ℹ️ @${target.split('@')[0]} is not an admin.`,
          mentions: [target]
        }, { quoted: msg });
      }

      await react01(sock, from, msg.key, 1500);
      await sock.groupParticipantsUpdate(from, [target], 'demote');
      await sock.sendMessage(from, {
        text: `⬇️ *Demoted!*\n\n@${target.split('@')[0]} is no longer an admin.`,
        mentions: [target]
      }, { quoted: msg });

    } catch (err) {
      await error01(sock, from, msg.key);
      await sock.sendMessage(from, { text: '❌ Failed to demote. Check my admin rights.' }, { quoted: msg });
    }
  }
};
