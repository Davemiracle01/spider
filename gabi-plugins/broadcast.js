/**
 * broadcast.js — Broadcast a message to all groups the bot is in
 * Owner only
 */
module.exports = {
  command: ["broadcast", "bc"],
  description: "Broadcast a message to all bot groups (owner only)",
  isOwner: true,

  async run({ sock, msg, from, text }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: "📢 Usage: .broadcast <your message>\n\nThis sends a message to all groups the bot is in."
      }, { quoted: msg });
    }

    let groups = [];
    try {
      const chats = await sock.groupFetchAllParticipating();
      groups = Object.keys(chats);
    } catch (err) {
      return sock.sendMessage(from, { text: `❌ Failed to fetch groups: ${err.message}` }, { quoted: msg });
    }

    if (!groups.length) {
      return sock.sendMessage(from, { text: "⚠️ Bot is not in any groups." }, { quoted: msg });
    }

    await sock.sendMessage(from, {
      text: `📢 Broadcasting to *${groups.length}* groups...`
    }, { quoted: msg });

    const broadcastText =
`📢 *BROADCAST MESSAGE*
━━━━━━━━━━━━━━━━━━━━
${text}
━━━━━━━━━━━━━━━━━━━━
_Sent by Gabimaru Bot_`;

    let success = 0;
    let fail = 0;
    for (const groupJid of groups) {
      try {
        await sock.sendMessage(groupJid, { text: broadcastText });
        success++;
        await new Promise(r => setTimeout(r, 500)); // rate limiting
      } catch {
        fail++;
      }
    }

    await sock.sendMessage(from, {
      text: `✅ *Broadcast complete!*\n\n📤 Sent: ${success}\n❌ Failed: ${fail}`
    }, { quoted: msg });
  }
};
