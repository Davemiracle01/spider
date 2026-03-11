/**
 * softban.js — Remove and immediately re-add a user (reset their messages)
 * Useful as a punishment that removes them then gives them a fresh start
 */
const { react01, error01 } = require('../lib/extra');

module.exports = {
  command: ['softban', 'sban'],
  description: 'Remove and re-invite a user (clears their messages)',
  category: 'Admin Menu',
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from }) {
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
    const target = quotedInfo?.mentionedJid?.[0] || quotedInfo?.participant;

    if (!target) {
      await error01(sock, from, msg.key);
      return sock.sendMessage(from, {
        text: `❌ *Usage:* Reply to a message or mention a user\n\n*.softban @user*\n\n_This removes the user then immediately re-adds them (soft reset)._`
      }, { quoted: msg });
    }

    const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    if (target === botId || target === sock.user?.id) {
      return sock.sendMessage(from, { text: '🤖 Cannot soft-ban myself.' }, { quoted: msg });
    }

    try {
      const meta = await sock.groupMetadata(from);
      const targetInfo = meta.participants.find(p => p.id === target);
      if (targetInfo?.admin) {
        return sock.sendMessage(from, {
          text: `❌ Cannot soft-ban an admin. Demote them first.`
        }, { quoted: msg });
      }

      await react01(sock, from, msg.key, 1000);

      // Notify the group
      await sock.sendMessage(from, {
        text: `⚠️ Soft-banning @${target.split('@')[0]}...`,
        mentions: [target]
      }, { quoted: msg });

      // Remove
      await sock.groupParticipantsUpdate(from, [target], 'remove');
      await new Promise(r => setTimeout(r, 2000));

      // Re-add
      await sock.groupParticipantsUpdate(from, [target], 'add');

      await sock.sendMessage(from, {
        text: `✅ *Soft-ban complete!*\n\n@${target.split('@')[0]} was removed and re-added.\n\n_This clears their recent messages and resets their status._`,
        mentions: [target]
      }, { quoted: msg });

    } catch (err) {
      console.error('Softban error:', err);
      await error01(sock, from, msg.key);
      await sock.sendMessage(from, {
        text: `❌ Soft-ban failed. The user may need to be re-added manually via group invite link.`
      }, { quoted: msg });
    }
  }
};
