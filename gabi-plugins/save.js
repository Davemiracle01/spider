const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { react01 } = require('../lib/extra');

module.exports = {
  command: ["save", "savemedia"],
  description: "Save a replied view-once image/video to your DM",

  async run({ sock, msg, from }) {
    await react01(sock, from, msg.key, 2000);

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    const mediaType = quoted?.imageMessage ? "image"
                    : quoted?.videoMessage ? "video"
                    : null;

    if (!mediaType) {
      return sock.sendMessage(from, {
        text: "❌ Please *reply to a view once image or video* to save it."
      }, { quoted: msg });
    }

    try {
      const stream = await downloadContentFromMessage(
        mediaType === "image" ? quoted.imageMessage : quoted.videoMessage,
        mediaType
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Send to bot's own DM (private - only sender sees it)
      await sock.sendMessage(sock.user.id, {
        [mediaType]: buffer,
        caption: `💥 Here's your saved view-once ${mediaType}`
      });

      await sock.sendMessage(from, {
        text: "✅ Saved! Check your DM with the bot."
      }, { quoted: msg });

    } catch (err) {
      console.error("❌ Save plugin error:", err);
      await sock.sendMessage(from, {
        text: "⚠️ Failed to retrieve view-once media."
      }, { quoted: msg });
    }
  }
};
