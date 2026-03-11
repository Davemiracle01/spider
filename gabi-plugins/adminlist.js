const { react01 } = require('../lib/extra');

module.exports = {
  command: ['adminlist', 'admins'],
  description: 'List all admins in the group',
  category: 'Group Menu',
  isGroup: true,

  async run({ sock, msg, from }) {
    await react01(sock, from, msg.key, 1000);
    try {
      const meta = await sock.groupMetadata(from);
      const admins = meta.participants.filter(p => p.admin);
      const superAdmins = admins.filter(p => p.admin === 'superadmin');
      const regularAdmins = admins.filter(p => p.admin === 'admin');

      let text = `╭───❖ 👑 Admin List ❖───\n`;
      text += `│ 🏠 *${meta.subject}*\n`;
      text += `│ 👥 Total Admins: ${admins.length}\n`;
      text += `╰─────────────────\n\n`;

      if (superAdmins.length) {
        text += `🌟 *Group Creator:*\n`;
        superAdmins.forEach(a => { text += `  › @${a.id.split('@')[0]}\n`; });
        text += `\n`;
      }

      if (regularAdmins.length) {
        text += `👑 *Admins:*\n`;
        regularAdmins.forEach(a => { text += `  › @${a.id.split('@')[0]}\n`; });
      }

      await sock.sendMessage(from, {
        text: text.trim(),
        mentions: admins.map(a => a.id)
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(from, { text: '❌ Could not fetch admin list.' }, { quoted: msg });
    }
  }
};
