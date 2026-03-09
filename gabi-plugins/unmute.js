module.exports = {
  command: ["unmute"],
  description: "Unmute the group (everyone can send messages)",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from }) {
    try {
      await sock.groupSettingUpdate(from, "not_announcement"); // everyone can send
      sock.sendMessage(from, { text: "🔊 Group has been *unmuted*. Everyone can send messages." }, { quoted: msg });
    } catch (e) {
      console.error("Unmute error:", e);
      sock.sendMessage(from, { text: "❌ Failed to unmute the group." }, { quoted: msg });
    }
  }
};