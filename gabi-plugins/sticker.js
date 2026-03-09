/**
 * sticker.js — Convert image/video to WhatsApp sticker
 */
const { Sticker } = require("wa-sticker-formatter");

module.exports = {
  command: ["sticker", "s", "stiker"],
  description: "Convert a quoted or sent image/video to a sticker",

  async run({ sock, msg, from, settings }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      || msg.message;

    const hasImage = quoted?.imageMessage;
    const hasVideo = quoted?.videoMessage;

    if (!hasImage && !hasVideo) {
      return sock.sendMessage(from, {
        text: "🖼️ *Sticker Maker*\n\nSend or quote an image/video then run *.sticker*"
      }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: "⏳ Creating sticker..." }, { quoted: msg });

    try {
      const mediaType = hasImage ? "imageMessage" : "videoMessage";
      const stream = await sock.downloadMediaMessage({ message: { [mediaType]: hasImage || hasVideo }, key: msg.key });

      const sticker = new Sticker(stream, {
        pack: settings.packname || "Gabimaru",
        author: settings.owner || "Gabimaru",
        type: "default",
        quality: 70,
      });

      await sock.sendMessage(from, await sticker.toMessage(), { quoted: msg });
    } catch (err) {
      console.error("[sticker error]", err.message);
      await sock.sendMessage(from, { text: `❌ Sticker creation failed: ${err.message}` }, { quoted: msg });
    }
  }
};
