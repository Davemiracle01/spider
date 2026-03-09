/**
 * self.js — Same as public.js but for self mode
 */
module.exports = {
  command: ["selfmode"],
  description: "Switch to self-only mode (owner only)",
  isOwner: true,

  async run({ sock, msg, from }) {
    sock.public = false;
    await sock.sendMessage(from, {
      text: "🔒 *Self Mode ON*\n\nOnly owner/sudo can now use the bot."
    }, { quoted: msg });
  }
};
