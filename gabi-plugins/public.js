/**
 * public.js — Toggle public/self mode
 */
module.exports = {
  command: ["public", "self"],
  description: "Toggle bot between public and self (owner only) mode",
  isOwner: true,

  async run({ sock, msg, from, commandName }) {
    if (commandName === "public") {
      sock.public = true;
      await sock.sendMessage(from, {
        text: "🌐 *Public Mode ON*\n\nEveryone can now use the bot!"
      }, { quoted: msg });
    } else {
      sock.public = false;
      await sock.sendMessage(from, {
        text: "🔒 *Self Mode ON*\n\nOnly owner/sudo can use the bot."
      }, { quoted: msg });
    }
  }
};
