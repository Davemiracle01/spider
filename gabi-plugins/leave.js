/**
 * leave.js — Make the bot leave a group
 */
module.exports = {
  command: ["leave"],
  description: "Make the bot leave this group (owner only)",
  isGroup: true,
  isOwner: true,

  async run({ sock, msg, from }) {
    await sock.sendMessage(from, { text: "👋 *Sayonara!*\n\nThe symbiote retreats into the shadows..." }, { quoted: msg });
    await new Promise(r => setTimeout(r, 1000));
    await sock.groupLeave(from);
  }
};
