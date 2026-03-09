/**
 * setname.js — Change group name
 */
module.exports = {
  command: ["setname", "groupname"],
  description: "Change the group name. Usage: .setname <new name>",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, text }) {
    if (!text) return sock.sendMessage(from, { text: "⚠️ Provide a name: .setname <new name>" }, { quoted: msg });
    try {
      await sock.groupUpdateSubject(from, text);
      await sock.sendMessage(from, { text: `✅ Group name changed to: *${text}*` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
    }
  }
};
