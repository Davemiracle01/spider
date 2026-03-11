/**
 * invitelink.js — Get, reset, or share group invite link
 */
const { react01, error01 } = require('../lib/extra');

module.exports = {
  command: ['invitelink', 'invite', 'link', 'revoke'],
  description: 'Get or reset the group invite link',
  category: 'Group Menu',
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, commandName }) {
    try {
      await react01(sock, from, msg.key, 1000);

      if (commandName === 'revoke') {
        const newCode = await sock.groupRevokeInvite(from);
        const newLink = `https://chat.whatsapp.com/${newCode}`;
        return sock.sendMessage(from, {
          text: `🔄 *Invite Link Revoked!*\n\nThe old link no longer works.\n\n🔗 *New Link:*\n${newLink}\n\n⚠️ Share this carefully!`
        }, { quoted: msg });
      }

      const code = await sock.groupInviteCode(from);
      const link = `https://chat.whatsapp.com/${code}`;
      const meta = await sock.groupMetadata(from);

      await sock.sendMessage(from, {
        text: `🔗 *Invite Link*\n\n🏠 *Group:* ${meta.subject}\n👥 *Members:* ${meta.participants.length}\n\n🌐 *Link:*\n${link}\n\n💡 Use *.revoke* to reset the link if it's been shared publicly.`
      }, { quoted: msg });

    } catch (err) {
      await error01(sock, from, msg.key);
      await sock.sendMessage(from, { text: '❌ Failed to get invite link. Check my admin permissions.' }, { quoted: msg });
    }
  }
};
