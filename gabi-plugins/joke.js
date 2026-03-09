const axios = require("axios");

module.exports = {
  command: ["joke", "lol", "funny"],
  description: "Get a random joke",

  async run({ sock, msg, from }) {
    try {
      const { data } = await axios.get(
        "https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist&type=twopart,single",
        { timeout: 5000 }
      );

      let jokeText;
      if (data.type === "twopart") {
        jokeText = `😂 *Joke Time!*\n\n❓ ${data.setup}\n\n💬 ${data.delivery}`;
      } else {
        jokeText = `😂 *Joke Time!*\n\n${data.joke}`;
      }

      await sock.sendMessage(from, { text: jokeText }, { quoted: msg });

    } catch (err) {
      console.error("Joke plugin error:", err.message);
      const fallbacks = [
        "😂 Why don't scientists trust atoms?\n\nBecause they make up everything! 💀",
        "😂 I told my wife she was drawing her eyebrows too high.\n\nShe looked surprised. 😐",
        "😂 Why can't a bicycle stand on its own?\n\nBecause it's two-tired! 🚲",
        "😂 What do you call fake spaghetti?\n\nAn impasta! 🍝",
      ];
      const joke = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      await sock.sendMessage(from, { text: joke }, { quoted: msg });
    }
  }
};
