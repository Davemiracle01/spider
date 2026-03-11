const { react01, error01 } = require('../lib/extra');

module.exports = {
  command: ['kick', 'remove'],
  description: 'Kick a member from the group',
  category: 'Admin Menu',
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from }) {
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
    const target = quotedInfo?.mentionedJid?.[0] || quotedInfo?.participant;

    if (!target) {
      await error01(sock, from, msg.key);
      return sock.sendMessage(from, {
        text: `❌ *No target found!*\n\n📌 *How to use:*\n› Reply to a message with *.kick*\n› Or mention: *.kick @user*`
      }, { quoted: msg });
    }

    const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    if (target === botId || target === sock.user?.id) {
      return sock.sendMessage(from, { text: '🤖 I cannot kick myself!' }, { quoted: msg });
    }

    try {
      const meta = await sock.groupMetadata(from);
      const targetInfo = meta.participants.find(p => p.id === target);
      if (targetInfo?.admin) {
        await error01(sock, from, msg.key);
        return sock.sendMessage(from, {
          text: `❌ Cannot kick *@${target.split('@')[0]}* — they are an admin!\n\n💡 Use *.demote* first.`,
          mentions: [target]
        }, { quoted: msg });
      }

      await react01(sock, from, msg.key, 1500);
      await sock.groupParticipantsUpdate(from, [target], 'remove');
      await sock.sendMessage(from, {
        text: `🦵 *Kicked!*\n\n👤 @${target.split('@')[0]} has been removed from the group.`,
        mentions: [target]
      }, { quoted: msg });

    } catch (err) {
      console.error('❌ Kick Error:', err);
      await error01(sock, from, msg.key);
      await sock.sendMessage(from, {
        text: `❌ Failed to kick. Make sure I have admin rights.`
      }, { quoted: msg });
    }
  }
};
