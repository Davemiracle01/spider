const axios = require("axios");

const fallbackQuotes = [
  { text: "I'll keep moving forward, even if it kills me.", author: "Gabimaru" },
  { text: "The strong one doesn't win. The one who wins is strong.", author: "Rock Lee" },
  { text: "It's not about if you get knocked down. It's about if you get back up.", author: "Unknown" },
  { text: "Power isn't determined by your size, but by the size of your heart and dreams.", author: "Marshall D. Teach" },
  { text: "Hard work is worthless for those that don't believe in themselves.", author: "Naruto Uzumaki" },
  { text: "If you don't like your destiny, don't accept it.", author: "Naruto Uzumaki" },
  { text: "The world isn't perfect, but it's there for us doing the best it can.", author: "Roy Mustang" },
  { text: "To know sorrow is not terrifying. What is terrifying is to know you can't go back to happiness.", author: "Matsumoto Rangiku" },
  { text: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", author: "Kenshin Himura" },
  { text: "Push through the pain, giving up is what kills people.", author: "Killua Zoldyck" },
];

module.exports = {
  command: ["quote", "aq", "animequote"],
  description: "Get a random anime or motivational quote",

  async run({ sock, msg, from }) {
    try {
      const { data } = await axios.get("https://animechan.io/api/v1/quotes/random", { timeout: 5000 });
      const quote = data?.data;

      if (quote && quote.content) {
        return sock.sendMessage(from, {
          text: `✨ *Quote of the Moment*\n\n_"${quote.content}"_\n\n— *${quote.character?.name || "Unknown"}* from *${quote.anime?.name || "Unknown"}*`,
        }, { quoted: msg });
      }
      throw new Error("bad response");
    } catch {
      const q = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      await sock.sendMessage(from, {
        text: `✨ *Quote of the Moment*\n\n_"${q.text}"_\n\n— *${q.author}*`,
      }, { quoted: msg });
    }
  }
};
