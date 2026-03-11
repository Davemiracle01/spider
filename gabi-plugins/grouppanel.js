/**
 * grouppanel.js — Interactive Group Admin Panel using WhatsApp List Messages
 * Shows an interactive list menu for group management actions
 * Uses WhatsApp list messages (the closest thing to buttons that Baileys supports reliably)
 */
const { react01 } = require('../lib/extra');

module.exports = {
  command: ['panel', 'gpanel', 'adminpanel', 'ap'],
  description: 'Interactive group admin control panel',
  category: 'Admin Menu',
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, settings }) {
    await react01(sock, from, msg.key, 800);

    try {
      const meta = await sock.groupMetadata(from);
      const p = settings.prefix;

      // WhatsApp List Message — shows a scrollable interactive menu
      const listMessage = {
        text:
`╭───❖ ⚙️ Admin Panel ❖───
│ 🏠 *${meta.subject}*
│ 👥 Members: ${meta.participants.length}
│ 👑 Admins: ${meta.participants.filter(x => x.admin).length}
╰─────────────────────

Select an action from the list below 👇`,
        footer: '🤖 Gabimaru Admin Panel',
        title: '⚙️ Group Control Panel',
        buttonText: '📋 Open Actions',
        sections: [
          {
            title: '🔒 Group Control',
            rows: [
              { title: '🔇 Lock Group', rowId: `${p}mute`, description: 'Only admins can send messages' },
              { title: '🔊 Unlock Group', rowId: `${p}unmute`, description: 'Everyone can send messages' },
              { title: '🔗 Get Invite Link', rowId: `${p}invitelink`, description: 'Show the group invite link' },
              { title: '🔄 Reset Invite Link', rowId: `${p}revoke`, description: 'Revoke and generate new link' },
            ]
          },
          {
            title: '👥 Member Management',
            rows: [
              { title: '👑 Admin List', rowId: `${p}adminlist`, description: 'See all admins' },
              { title: '👥 Member Count', rowId: `${p}members`, description: 'See member stats' },
              { title: '📋 Group Rules', rowId: `${p}rules`, description: 'View group rules' },
              { title: '📊 Group Info', rowId: `${p}groupinfo`, description: 'Full group information' },
            ]
          },
          {
            title: '🛡️ Protection',
            rows: [
              { title: '🚫 Anti-Link ON', rowId: `${p}antilink on`, description: 'Block links in group' },
              { title: '✅ Anti-Link OFF', rowId: `${p}antilink off`, description: 'Allow links in group' },
              { title: '🏷️ Tag Everyone', rowId: `${p}tagall`, description: 'Mention all members' },
              { title: '📢 Warn Settings', rowId: `${p}warnconfig`, description: 'Configure warn system' },
            ]
          }
        ]
      };

      await sock.sendMessage(from, listMessage, { quoted: msg });

    } catch (err) {
      console.error('Panel error:', err);
      // Fallback to text if list messages aren't supported
      const p = settings.prefix;
      const meta = await sock.groupMetadata(from).catch(() => ({ subject: 'Group', participants: [] }));
      await sock.sendMessage(from, {
        text:
`╭───❖ ⚙️ Admin Panel ❖───
│ 🏠 *${meta.subject}*
╰─────────────────────

🔒 *Group Control*
› ${p}mute — Lock group
› ${p}unmute — Unlock group
› ${p}invitelink — Get invite link
› ${p}revoke — Reset invite link

👥 *Members*
› ${p}adminlist — List admins
› ${p}members — Member stats
› ${p}rules — Group rules
› ${p}groupinfo — Full group info

🛡️ *Protection*
› ${p}antilink on/off — Anti-link toggle
› ${p}tagall — Tag everyone
› ${p}warnconfig — Warn settings`
      }, { quoted: msg });
    }
  }
};
