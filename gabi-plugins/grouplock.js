/**
 * grouplock.js — Lock/unlock group (only admins can send)
 */
module.exports = {
  command: ["lock", "unlock"],
  description: "Lock/unlock the group (only admins can send messages). Requires bot admin.",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, commandName }) {
    try {
      const setting = commandName === "lock" ? "announcement" : "not_announcement";
      await sock.groupSettingUpdate(from, setting);
      await sock.sendMessage(from, {
        text: commandName === "lock"
          ? "🔒 Group *locked*. Only admins can send messages."
          : "🔓 Group *unlocked*. Everyone can send messages."
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed: ${err.message}\nMake sure bot is admin.` }, { quoted: msg });
    }
  }
};
