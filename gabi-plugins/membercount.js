const { react01 } = require('../lib/extra');

module.exports = {
  command: ['members', 'count', 'gc'],
  description: 'Show group member stats',
  category: 'Group Menu',
  isGroup: true,

  async run({ sock, msg, from }) {
    await react01(sock, from, msg.key, 800);
    try {
      const meta = await sock.groupMetadata(from);
      const total = meta.participants.length;
      const admins = meta.participants.filter(p => p.admin).length;
      const members = total - admins;
      const createdDate = meta.creation
        ? new Date(meta.creation * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Unknown';

      await sock.sendMessage(from, {
        text:
`╭───❖ 👥 Member Stats ❖───
│ 🏠 *${meta.subject}*
│
│ 👥 *Total Members:* ${total}
│ 👑 *Admins:* ${admins}
│ 👤 *Regular Members:* ${members}
│ 📅 *Group Created:* ${createdDate}
╰─────────────────────`
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(from, { text: '❌ Could not fetch group info.' }, { quoted: msg });
    }
  }
};
