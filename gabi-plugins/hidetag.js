/**
 * hidetag.js — Tag all members silently
 */
module.exports = {
  command: ["hidetag", "everyone", "htag"],
  description: "Silently tag all group members. Usage: .hidetag <message>",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, text }) {
    let meta;
    try { meta = await sock.groupMetadata(from); } catch (err) {
      return sock.sendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
    }

    const members = meta.participants.map(p => p.id);
    await sock.sendMessage(from, {
      text: text || "📢 Attention!",
      mentions: members
    }, { quoted: msg });
  }
};
