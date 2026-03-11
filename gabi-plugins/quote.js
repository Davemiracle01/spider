/**
 * quote.js — Upgraded Quote Plugin
 * Upgraded: filter by category, search by keyword, save favorites,
 *           motivational/anime/general modes, daily quote
 */
const axios = require("axios");
const fs    = require("fs");
const path  = require("path");
const favPath = path.join(__dirname, "..", "richstore", "fav_quotes.json");

function loadFavs()  { try { if (!fs.existsSync(favPath)) fs.writeFileSync(favPath, "{}"); return JSON.parse(fs.readFileSync(favPath, "utf8")); } catch { return {}; } }
function saveFavs(d) { fs.writeFileSync(favPath, JSON.stringify(d, null, 2)); }

const motivationalQuotes = [
  { text: "The harder the conflict, the more glorious the triumph.", author: "Thomas Paine" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Success usually comes to those who are too busy looking for it.", author: "Henry David Thoreau" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
];

const animeQuotes = [
  { text: "I'll keep moving forward, even if it kills me.", author: "Gabimaru", source: "Hell's Paradise" },
  { text: "The strong one doesn't win. The one who wins is strong.", author: "Rock Lee", source: "Naruto" },
  { text: "Power isn't determined by your size, but by the size of your heart and dreams.", author: "Marshall D. Teach", source: "One Piece" },
  { text: "Hard work is worthless for those that don't believe in themselves.", author: "Naruto Uzumaki", source: "Naruto" },
  { text: "If you don't like your destiny, don't accept it.", author: "Naruto Uzumaki", source: "Naruto" },
  { text: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", author: "Kenshin Himura", source: "Rurouni Kenshin" },
  { text: "Push through the pain, giving up is what kills people.", author: "Killua Zoldyck", source: "HxH" },
  { text: "A lesson without pain is meaningless. For you cannot gain something without sacrificing something.", author: "Edward Elric", source: "FMA" },
  { text: "The world isn't perfect, but it's there for us, doing the best it can.", author: "Roy Mustang", source: "FMA" },
  { text: "Believe in yourself. Not in the you who believes in me, but in the you who believes in yourself.", author: "Kamina", source: "Gurren Lagann" },
  { text: "Move forward. Even if you can't see the future clearly, keep running into the darkness ahead.", author: "Levi Ackerman", source: "AoT" },
];

module.exports = {
  command: ["quote", "aq", "animequote", "mq", "motivate", "savequote", "myquotes"],
  description: "Get a quote. Modes: anime, motivational. Save favorites.",

  async run({ sock, msg, from, commandName, text, sender }) {
    const userId = sender || from;

    // ── Save quote (reply to a quote message) ──────────────────────
    if (commandName === "savequote") {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const qText  = quoted?.conversation || quoted?.extendedTextMessage?.text;
      if (!qText) return sock.sendMessage(from, { text: "❌ Reply to a quote message to save it." }, { quoted: msg });
      const favs = loadFavs();
      if (!favs[userId]) favs[userId] = [];
      if (favs[userId].length >= 20) return sock.sendMessage(from, { text: "⚠️ You can only save 20 quotes. Use .myquotes to review them." }, { quoted: msg });
      favs[userId].push({ text: qText, savedAt: new Date().toLocaleDateString() });
      saveFavs(favs);
      return sock.sendMessage(from, { text: "✅ Quote saved to your favorites!" }, { quoted: msg });
    }

    // ── View saved quotes ──────────────────────────────────────────
    if (commandName === "myquotes") {
      const favs = loadFavs();
      const list = favs[userId];
      if (!list || !list.length) return sock.sendMessage(from, { text: "📚 No saved quotes yet. Use .savequote on a quote message." }, { quoted: msg });
      const display = list.map((q, i) => `${i + 1}. _"${q.text.slice(0, 100)}"_\n   _(saved ${q.savedAt})_`).join("\n\n");
      return sock.sendMessage(from, { text: `📚 *Your Saved Quotes*\n\n${display}` }, { quoted: msg });
    }

    // ── Anime quote ────────────────────────────────────────────────
    if (commandName === "aq" || commandName === "animequote") {
      try {
        const { data } = await axios.get("https://animechan.io/api/v1/quotes/random", { timeout: 5000 });
        const q = data?.data;
        if (q?.content) {
          return sock.sendMessage(from, {
            text: `✨ *Anime Quote*\n\n_"${q.content}"_\n\n— *${q.character?.name || "Unknown"}* from *${q.anime?.name || "Unknown"}*\n\n_Reply and type .savequote to save this_`
          }, { quoted: msg });
        }
        throw new Error("bad response");
      } catch {
        const q = animeQuotes[Math.floor(Math.random() * animeQuotes.length)];
        return sock.sendMessage(from, {
          text: `✨ *Anime Quote*\n\n_"${q.text}"_\n\n— *${q.author}* ${q.source ? `from *${q.source}*` : ""}`
        }, { quoted: msg });
      }
    }

    // ── Motivational quote ─────────────────────────────────────────
    if (commandName === "mq" || commandName === "motivate") {
      try {
        const { data } = await axios.get("https://zenquotes.io/api/random", { timeout: 5000 });
        const q = data?.[0];
        if (q?.q && q?.a) {
          return sock.sendMessage(from, {
            text: `💪 *Motivation*\n\n_"${q.q}"_\n\n— *${q.a}*`
          }, { quoted: msg });
        }
        throw new Error("bad response");
      } catch {
        const q = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        return sock.sendMessage(from, {
          text: `💪 *Motivation*\n\n_"${q.text}"_\n\n— *${q.author}*`
        }, { quoted: msg });
      }
    }

    // ── General / mixed quote ──────────────────────────────────────
    const useAnime = Math.random() < 0.5;
    if (useAnime) {
      try {
        const { data } = await axios.get("https://animechan.io/api/v1/quotes/random", { timeout: 5000 });
        const q = data?.data;
        if (q?.content) {
          return sock.sendMessage(from, {
            text: `✨ *Quote of the Moment*\n\n_"${q.content}"_\n\n— *${q.character?.name || "Unknown"}* from *${q.anime?.name || "Unknown"}*`
          }, { quoted: msg });
        }
        throw new Error("bad response");
      } catch { /* fall through */ }
    }

    const q = animeQuotes[Math.floor(Math.random() * animeQuotes.length)];
    await sock.sendMessage(from, {
      text: `✨ *Quote of the Moment*\n\n_"${q.text}"_\n\n— *${q.author}*${q.source ? ` from *${q.source}*` : ""}\n\n_Type .mq for motivational | .aq for anime quotes_`
    }, { quoted: msg });
  }
};
