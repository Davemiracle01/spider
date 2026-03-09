/**
 * lyrics.js — Fetch song lyrics
 */
const axios = require("axios");

module.exports = {
  command: ["lyrics", "lyric"],
  description: "Get lyrics for a song. Usage: .lyrics <song name> - <artist>",

  async run({ sock, msg, from, text }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: "🎵 Usage: .lyrics <song> - <artist>\n\nExample: .lyrics Blinding Lights - The Weeknd"
      }, { quoted: msg });
    }

    const [title, artist] = text.split("-").map(s => s.trim());

    try {
      const { data } = await axios.get("https://api.lyrics.ovh/v1/" + encodeURIComponent(artist || title) + "/" + encodeURIComponent(title), {
        timeout: 10000
      });

      if (!data.lyrics) throw new Error("No lyrics found");

      // Truncate to avoid message too long
      const lyricsText = data.lyrics.slice(0, 3000) + (data.lyrics.length > 3000 ? "\n\n_...lyrics truncated_" : "");

      await sock.sendMessage(from, {
        text: `🎵 *${title}*${artist ? ` — ${artist}` : ""}\n\n${lyricsText}`
      }, { quoted: msg });
    } catch {
      await sock.sendMessage(from, {
        text: `❌ Lyrics not found for: *${text}*\n\nTry: .lyrics Song Name - Artist Name`
      }, { quoted: msg });
    }
  }
};
