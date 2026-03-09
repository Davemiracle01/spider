/**
 * ghost.js — Toggle ghost mode (hide online/typing status)
 */
module.exports = {
  command: ["ghost", "incognito"],
  description: "Toggle ghost mode — hide read receipts and online status (owner only)",
  isOwner: true,

  async run({ sock, msg, from, args }) {
    const toggle = args[0]?.toLowerCase();
    if (!toggle || !["on", "off"].includes(toggle)) {
      return sock.sendMessage(from, {
        text: "👻 Usage: .ghost on | off\n\nGhost mode hides your read receipts and online status."
      }, { quoted: msg });
    }

    try {
      await sock.updateLastSeenPrivacy(toggle === "on" ? "none" : "all");
      await sock.updateOnlinePrivacy(toggle === "on" ? "match_last_seen" : "all");
      await sock.updateReadReceiptsPrivacy(toggle === "on" ? "none" : "all");
      await sock.sendMessage(from, {
        text: `👻 Ghost mode is now *${toggle.toUpperCase()}* ${toggle === "on" ? "🟢" : "🔴"}`
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
    }
  }
};
