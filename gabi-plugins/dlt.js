/**
 * dlt.js — Delete a bot message (by replying to it)
 */
module.exports = {
  command: ["dlt", "del", "delete"],
  description: "Delete a message sent by the bot. Reply to the message and use .dlt",

  async run({ sock, msg, from, isSudo }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.stanzaId) {
      return sock.sendMessage(from, { text: "⚠️ Reply to a message to delete it." }, { quoted: msg });
    }

    const targetKey = {
      remoteJid: from,
      fromMe: ctx.participant === sock.user?.id || isSudo,
      id: ctx.stanzaId,
      participant: ctx.participant
    };

    try {
      await sock.sendMessage(from, { delete: targetKey });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed to delete: ${err.message}` }, { quoted: msg });
    }
  }
};
