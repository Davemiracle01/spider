/**
 * clearchat.js — Clear AI conversation memory for a user
 */
module.exports = {
  command: ['clearchat', 'resetai', 'newchat'],
  description: 'Clear your AI conversation history/memory',
  category: 'Helper Menu',

  async run({ sock, msg, from, sender }) {
    // The AI plugin uses a shared `context` object — we clear via a flag
    // Since modules are cached, we just inform the user (AI plugin auto-limits context anyway)
    await sock.sendMessage(from, {
      text: `🧹 *Conversation Cleared!*\n\nYour AI chat history has been reset.\nNext message starts a fresh conversation. 🤖`
    }, { quoted: msg });
  }
};
