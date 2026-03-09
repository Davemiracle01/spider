/**
 * mute.js — Mute the group (only admins can message)
 */
module.exports = {
  command: ["mute"],
  description: "Mute the group — only admins can send messages. Requires bot admin.",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from }) {
    try {
      await sock.groupSettingUpdate(from, "announcement");
      await sock.sendMessage(from, {
        text: "🔇 Group has been *muted*. Only admins can send messages."
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed: ${err.message}\nMake sure bot is admin.` }, { quoted: msg });
    }
  }
};
