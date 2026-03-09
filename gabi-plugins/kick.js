/**
 * kick.js — Kick a member from the group
 */
module.exports = {
  command: ["kick", "remove"],
  description: "Kick a member from the group. Usage: .kick @user",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, isSudo }) {
    const quotedInfo   = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = quotedInfo?.mentionedJid?.[0];
    const repliedToJid = quotedInfo?.participant;
    const target       = mentionedJid || repliedToJid;

    if (!target) {
      return sock.sendMessage(from, { text: "❌ Mention or reply to the user to kick." }, { quoted: msg });
    }

    const meta = await sock.groupMetadata(from).catch(() => null);
    const isTargetAdmin = meta?.participants?.find(p => p.id === target)?.admin;
    if (isTargetAdmin && !isSudo) {
      return sock.sendMessage(from, { text: "⚠️ Cannot kick an admin." }, { quoted: msg });
    }

    try {
      await sock.groupParticipantsUpdate(from, [target], "remove");
      await sock.sendMessage(from, {
        text: `👢 @${target.split("@")[0]} has been kicked.`,
        mentions: [target]
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed to kick: ${err.message}` }, { quoted: msg });
    }
  }
};
