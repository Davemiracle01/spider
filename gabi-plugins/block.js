/**
 * block.js — Block/Unblock a user (owner only)
 */
module.exports = {
  command: ["block", "unblock"],
  description: "Block or unblock a number (owner only). Usage: .block @user or .unblock @user",
  isOwner: true,

  async run({ sock, msg, from, commandName }) {
    const quotedInfo   = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = quotedInfo?.mentionedJid?.[0];
    const repliedToJid = quotedInfo?.participant;
    const target       = mentionedJid || repliedToJid;

    if (!target) {
      return sock.sendMessage(from, {
        text: `⚠️ Mention or reply to the user to ${commandName}.\n\nExample: *.${commandName} @user*`
      }, { quoted: msg });
    }

    try {
      const action = commandName === "block" ? "block" : "unblock";
      await sock.updateBlockStatus(target, action);
      await sock.sendMessage(from, {
        text: `${commandName === "block" ? "🚫 Blocked" : "✅ Unblocked"} @${target.split("@")[0]}`,
        mentions: [target]
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
    }
  }
};
