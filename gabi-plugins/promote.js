/**
 * promote.js — Promote a member to admin
 */
module.exports = {
  command: ["promote"],
  description: "Promote a member to group admin. Usage: .promote @user",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from }) {
    const quotedInfo   = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = quotedInfo?.mentionedJid?.[0];
    const repliedToJid = quotedInfo?.participant;
    const target       = mentionedJid || repliedToJid;

    if (!target) return sock.sendMessage(from, { text: "❌ Mention or reply to the user to promote." }, { quoted: msg });

    try {
      await sock.groupParticipantsUpdate(from, [target], "promote");
      await sock.sendMessage(from, {
        text: `⬆️ @${target.split("@")[0]} has been promoted to admin. 👑`,
        mentions: [target]
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
    }
  }
};
