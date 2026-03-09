/**
 * hijack.js — Group link fetch (owner only)
 * RESTRICTED: Owner/Dev only
 */
module.exports = {
  command: ["hijack"],
  description: "Fetch the invite link of a group the bot is in (owner only). Usage: .hijack <groupJid>",
  isOwner: true,

  async run({ sock, msg, from, args, text }) {
    const groupJid = text?.trim();
    if (!groupJid || !groupJid.endsWith("@g.us")) {
      return sock.sendMessage(from, {
        text: "⚠️ Usage: .hijack <groupJid>\n\nExample: .hijack 120363xxxxxxx@g.us\n\nUse .chatid in the group to get its JID."
      }, { quoted: msg });
    }

    try {
      const code = await sock.groupInviteCode(groupJid);
      await sock.sendMessage(from, {
        text: `🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}\n\n_Use responsibly. This is for bot administration only._`
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
    }
  }
};
