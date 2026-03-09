const axios = require("axios");

module.exports = {
  command: ["waifu"],
  description: "Sends a random waifu image",
  category: "fun",

  async run({ msg, sock, from }) {
    try {
      const res = await axios.get("https://ayokunle-restapi-8ma5.onrender.com/waifu?");
      const { status, url, creator } = res.data;

      if (status !== "success" || !url) {
        return sock.sendMessage(from, {
          text: "⚠️ Failed to fetch waifu image. Try again later."
        }, { quoted: msg });
      }

      await sock.sendMessage(from, {
        image: { url },
        caption: `🌸 Here's your waifu :-)`
      }, { quoted: msg });

    } catch (err) {
      console.error("Waifu plugin error:", err.message);
      sock.sendMessage(from, {
        text: "❌ Something went wrong fetching waifu image."
      }, { quoted: msg });
    }
  }
};