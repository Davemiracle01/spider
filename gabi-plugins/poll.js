/**
 * poll.js — Create a poll in a group
 */
module.exports = {
  command: ["poll"],
  description: "Create a poll. Usage: .poll Question | Option1 | Option2 | Option3",
  isGroup: true,

  async run({ sock, msg, from, text }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: "📊 Usage: *.poll Question | Option1 | Option2 | Option3*\n\nExample:\n.poll Favorite color | Red | Blue | Green"
      }, { quoted: msg });
    }

    const parts = text.split("|").map(p => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      return sock.sendMessage(from, {
        text: "⚠️ Provide a question and at least 2 options separated by |"
      }, { quoted: msg });
    }

    const question = parts[0];
    const options  = parts.slice(1, 13); // max 12 options

    try {
      await sock.sendMessage(from, {
        poll: { name: question, values: options, selectableCount: 1 }
      }, { quoted: msg });
    } catch (err) {
      // Fallback: text-based poll
      const numbered = options.map((o, i) => `${i + 1}. ${o}`).join("\n");
      await sock.sendMessage(from, {
        text: `📊 *Poll*\n\n❓ ${question}\n\n${numbered}\n\n_Reply with the number to vote!_`
      }, { quoted: msg });
    }
  }
};
