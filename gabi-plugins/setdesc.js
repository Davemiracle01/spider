/**
 * setdesc.js — Change group description
 */
module.exports = {
  command: ["setdesc", "groupdesc"],
  description: "Change the group description. Usage: .setdesc <new description>",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, text }) {
    if (!text) return sock.sendMessage(from, { text: "⚠️ Provide a description: .setdesc <text>" }, { quoted: msg });
    try {
      await sock.groupUpdateDescription(from, text);
      await sock.sendMessage(from, { text: `✅ Group description updated.` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
    }
  }
};
