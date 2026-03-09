module.exports = {
  command: ["8ball", "magic", "oracle"],
  description: "Ask the magic 8-ball a question. Usage: .8ball Will I win today?",

  async run({ sock, msg, from, text }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: "⚠️ Ask the oracle a question!\n\nExample: `.8ball Will I be rich?`"
      }, { quoted: msg });
    }

    const responses = [
      // Positive
      { text: "It is certain.", emoji: "✅" },
      { text: "It is decidedly so.", emoji: "✅" },
      { text: "Without a doubt.", emoji: "✅" },
      { text: "Yes, definitely.", emoji: "✅" },
      { text: "You may rely on it.", emoji: "✅" },
      { text: "As I see it, yes.", emoji: "✅" },
      { text: "Most likely.", emoji: "✅" },
      { text: "Outlook good.", emoji: "✅" },
      { text: "Signs point to yes.", emoji: "✅" },
      // Neutral
      { text: "Reply hazy, try again.", emoji: "🔮" },
      { text: "Ask again later.", emoji: "🔮" },
      { text: "Better not tell you now.", emoji: "🔮" },
      { text: "Cannot predict now.", emoji: "🔮" },
      { text: "Concentrate and ask again.", emoji: "🔮" },
      // Negative
      { text: "Don't count on it.", emoji: "❌" },
      { text: "My reply is no.", emoji: "❌" },
      { text: "My sources say no.", emoji: "❌" },
      { text: "Outlook not so good.", emoji: "❌" },
      { text: "Very doubtful.", emoji: "❌" },
    ];

    const pick = responses[Math.floor(Math.random() * responses.length)];

    await sock.sendMessage(from, {
      text: `🎱 *Magic 8-Ball*\n\n❓ *Q:* ${text}\n\n${pick.emoji} *A:* _${pick.text}_`
    }, { quoted: msg });
  }
};
