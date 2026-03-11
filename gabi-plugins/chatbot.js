const { toggleChatbot } = require("../chatbot");
const { react01 } = require('../lib/extra');

module.exports = {
  command: ["chatbot"],
  description: "Enable/disable chatbot in this chat",
   isSudo: true,
   
  async run({ sock, msg, from }) {

    const nowEnabled = toggleChatbot(from);
    const text = nowEnabled
      ? "🚫 Chatbot deactivated in this chat."
      : "✅ Chatbot reactivated in this chat.";
      
    await react01(sock, from, msg.key, 2000);
    sock.sendMessage(from, { text }, { quoted: msg });
  }
};