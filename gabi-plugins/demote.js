/**
 * demote.js — Demote an admin to regular member
 */
module.exports = {
  command: ["demote"],
  description: "Demote a group admin to regular member. Usage: .demote @user",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from }) {
    const quotedInfo   = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = quotedInfo?.mentionedJid?.[0];
    const repliedToJid = quotedInfo?.participant;
    const target       = mentionedJid || repliedToJid;

    if (!target) return sock.sendMessage(from, { text: "❌ Mention or reply to the admin to demote." }, { quoted: msg });

    try {
      await sock.groupParticipantsUpdate(from, [target], "demote");
      await sock.sendMessage(from, {
        text: `⬇️ @${target.split("@")[0]} has been demoted.`,
        mentions: [target]
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed: ${err.message}` }, { quoted: msg });
    }
  }
};
