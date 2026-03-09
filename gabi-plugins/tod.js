const axios = require("axios");

const fallbackTruths = [
  "What's the most embarrassing thing you've done in public?",
  "Have you ever lied to your best friend? What about?",
  "What's the biggest secret you've kept from your parents?",
  "Who was your first crush and do they know?",
  "What's the most childish thing you still do?",
  "What's a habit you have that you're most ashamed of?",
  "Have you ever cheated on a test?",
  "What's the worst thing you've ever said to someone you love?",
  "What's the craziest dream you've ever had?",
  "What's something you've done that you've never told anyone?",
];

const fallbackDares = [
  "Send a voice note saying 'I love pineapple on pizza' to this chat.",
  "Change your status to 'I talk to myself' for 10 minutes.",
  "Text your last contact 'Quack quack' and screenshot their response.",
  "Speak in reverse sentences for the next 3 messages.",
  "Send your most embarrassing photo in this chat.",
  "Do 10 push-ups and report back.",
  "Call someone in your contacts and sing Happy Birthday to them.",
  "Send a voice message roaring like a lion.",
  "Type everything in caps for the next 5 messages.",
  "Put an ice cube in your mouth and say a full sentence.",
];

module.exports = {
  command: ["truth", "dare", "tod"],
  description: "Truth or Dare! Usage: .truth | .dare | .tod",

  async run({ sock, msg, from, commandName }) {
    let type = commandName;

    // .tod — random choice
    if (type === "tod") {
      type = Math.random() < 0.5 ? "truth" : "dare";
    }

    let result;
    try {
      if (type === "truth") {
        const { data } = await axios.get("https://api.truthordarebot.xyz/v1/truth", { timeout: 5000 });
        result = data?.question;
      } else {
        const { data } = await axios.get("https://api.truthordarebot.xyz/v1/dare", { timeout: 5000 });
        result = data?.question;
      }
    } catch { result = null; }

    if (!result) {
      const pool = type === "truth" ? fallbackTruths : fallbackDares;
      result = pool[Math.floor(Math.random() * pool.length)];
    }

    const emoji = type === "truth" ? "💬" : "🎯";
    const label = type === "truth" ? "TRUTH" : "DARE";

    await sock.sendMessage(from, {
      text: `${emoji} *${label}*\n\n${result}`
    }, { quoted: msg });
  }
};
