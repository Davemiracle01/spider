const axios = require("axios");
const { react01 } = require('../lib/extra');

module.exports = {
  command: ["play", "music"],
  description: "Search and fetch YouTube audio",
  async run({ sock, msg, text, from }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: "❌ Usage: .play <song name>"
      }, { quoted: msg });
    }

    await react01(sock, from, msg.key, 2000);

    try {
      const { data } = await axios.get(`https://ochinpo-helper.hf.space/yt?query=${encodeURIComponent(text)}`);

      if (!data.success || !data.result?.download?.audio) {
        return sock.sendMessage(from, {
          text: "❌ Couldn't find that track. Try another one."
        }, { quoted: msg });
      }

      const { title, url, image, duration, views, author, download } = data.result;

      await sock.sendMessage(from, {
        image: { url: image },
        caption: `🎧 *${title}*\n👤 ${author.name}\n📺 ${views} views\n🕒 ${duration.timestamp}\n🔗 ${url}\n> Gabimaru bot`
      }, { quoted: msg });

      await sock.sendMessage(from, {
        audio: { url: download.audio },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`
      }, { quoted: msg });

    } catch (err) {
      console.log("Play command error:", err);
      sock.sendMessage(from, {
        text: "❌ Something went wrong. Try again later."
      }, { quoted: msg });
    }
  }
};
