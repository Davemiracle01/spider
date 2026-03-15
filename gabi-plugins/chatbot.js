const { toggleChatbot } = require("../chatbot");
const { react01 } = require('../lib/extra');

module.exports = {
  command: ["chatbot"],
  description: "Enable/disable chatbot in this chat",
  isSudo: true,

  async run({ sock, msg, from }) {
    try {
      const { key } = msg;
      const nowEnabled = toggleChatbot(from);

      const text = nowEnabled
        ? "✅ Chatbot activated in this chat."
        : "🚫 Chatbot deactivated in this chat.";

      await sock.sendMessage(from, { text }, { quoted: msg });
      await react01(sock, from, key, 2000);

    } catch (err) {
      console.error("[chatbot cmd] Error:", err);
      await sock.sendMessage(from, {
        text: "❌ Failed to toggle chatbot. Please try again."
      }, { quoted: msg }).catch(() => {});
    }
  }
};