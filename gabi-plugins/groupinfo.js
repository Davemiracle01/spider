/**
 * groupinfo.js — Display group information
 */
module.exports = {
  command: ["groupinfo", "ginfo"],
  description: "Show detailed info about the current group",
  isGroup: true,

  async run({ sock, msg, from }) {
    try {
      const meta = await sock.groupMetadata(from);
      const admins = meta.participants.filter(p => p.admin).map(p => `› @${p.id.split("@")[0]}`).join("\n");
      const total = meta.participants.length;
      const adminCount = meta.participants.filter(p => p.admin).length;
      const memberCount = total - adminCount;

      const createdDate = meta.creation
        ? new Date(meta.creation * 1000).toLocaleDateString("en-KE")
        : "Unknown";

      await sock.sendMessage(from, {
        text:
`╭━━━〔 📋 GROUP INFO 〕━━━⬣
┃ 📌 *Name:* ${meta.subject}
┃ 🆔 *JID:* ${from}
┃ 👥 *Members:* ${total}
┃ 👑 *Admins:* ${adminCount}
┃ 👤 *Members:* ${memberCount}
┃ 📅 *Created:* ${createdDate}
┃ 📝 *Description:*
┃ ${(meta.desc || "No description").slice(0, 100)}
┃
┃ 👑 *Admin List:*
${admins || "None"}
╰━━━━━━━━━━━━━━━━⬣`,
        mentions: meta.participants.filter(p => p.admin).map(p => p.id)
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
    }
  }
};
