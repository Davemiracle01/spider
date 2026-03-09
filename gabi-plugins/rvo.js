/**
 * rvo.js — Reveal view-once messages
 */
module.exports = {
  command: ["rvo", "reveal"],
  description: "Reveal a view-once image or video. Reply to the view-once message.",
  isOwner: true,

  async run({ sock, msg, from }) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.quotedMessage) {
      return sock.sendMessage(from, {
        text: "👁️ Reply to a view-once message with *.rvo* to reveal it."
      }, { quoted: msg });
    }

    const voMsg =
      ctx.quotedMessage?.viewOnceMessage?.message ||
      ctx.quotedMessage?.viewOnceMessageV2?.message ||
      ctx.quotedMessage?.viewOnceMessageV2Extension?.message ||
      ctx.quotedMessage;

    const imageMsg = voMsg?.imageMessage;
    const videoMsg = voMsg?.videoMessage;

    if (!imageMsg && !videoMsg) {
      return sock.sendMessage(from, { text: "❌ No view-once media found in that message." }, { quoted: msg });
    }

    try {
      const fakeMsg = {
        key: { remoteJid: from, id: ctx.stanzaId, fromMe: false, participant: ctx.participant },
        message: voMsg
      };
      const stream = await sock.downloadMediaMessage(fakeMsg);

      if (imageMsg) {
        await sock.sendMessage(from, { image: stream, caption: "👁️ View-Once revealed" }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { video: stream, caption: "👁️ View-Once revealed" }, { quoted: msg });
      }
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed to reveal: ${err.message}` }, { quoted: msg });
    }
  }
};
