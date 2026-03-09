const { toggleChatbot } = require("../chatbot");

module.exports = {
  command: ["chatbot"],
  description: "Enable/disable chatbot in this chat",
  isSudo: true,

  async run({ sock, msg, from }) {
    const nowEnabled = toggleChatbot(from);
    // FIX: messages were swapped — toggleChatbot returns true when NOW enabled (was just re-enabled),
    //   but the original code showed "Chatbot deactivated" when nowEnabled was true.
    const text = nowEnabled
      ? "Chatbot reactivated in this chat."
      : "Chatbot deactivated in this chat.";

    sock.sendMessage(from, { text }, { quoted: msg });
  }
};
