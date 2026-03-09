const axios = require("axios");
const { Sticker } = require("wa-sticker-formatter");

// Telegram bot token for sticker fetching — set TELEGRAM_BOT_TOKEN env var
// Default fallback is provided but you should use your own bot token
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "891038791:AAHWB1dQd-vi0IbH2NjKYUk-hqQ8rQuzPD4";
if (!TG_TOKEN) { module.exports.run = async ({ sock, msg, from }) => sock.sendMessage(from, { text: "⚠️ TELEGRAM_BOT_TOKEN not set. Ask the owner to configure it." }, { quoted: msg }); }
const TG_API   = `https://api.telegram.org/bot${TG_TOKEN}`;
const TG_FILE  = `https://api.telegram.org/file/bot${TG_TOKEN}`;

async function fetchStickerUrls(packName) {
  const res = await axios.get(`${TG_API}/getStickerSet?name=${encodeURIComponent(packName)}`, {
    headers: { "User-Agent": "GoogleBot" },
    timeout: 10000,
  });

  const stickers = res.data.result.stickers;
  const urls = [];

  for (const sticker of stickers) {
    const fileId   = sticker.thumb?.file_id;
    if (!fileId) continue;
    const fileData = await axios.get(`${TG_API}/getFile?file_id=${fileId}`, { timeout: 8000 });
    urls.push(`${TG_FILE}/${fileData.data.result.file_path}`);
  }

  return urls;
}

module.exports = {
  command: ["telesticker", "telestick"],
  description: "Convert a Telegram sticker pack to WhatsApp stickers",

  async run({ sock, msg, text, from }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: "🔗 Send a Telegram sticker pack link.\n\nExample: .telesticker https://t.me/addstickers/ShinobuKawaii",
      }, { quoted: msg });
    }

    if (!text.match(/https:\/\/t\.me\/addstickers\//i)) {
      return sock.sendMessage(from, { text: "❌ Invalid Telegram sticker link." }, { quoted: msg });
    }

    const packName = text.replace("https://t.me/addstickers/", "");

    try {
      await sock.sendMessage(from, { text: "⏳ Fetching sticker pack, please wait..." }, { quoted: msg });
      const urls = await fetchStickerUrls(packName);

      if (!urls.length) {
        return sock.sendMessage(from, { text: "❌ No stickers found in that pack." }, { quoted: msg });
      }

      const limit = Math.min(5, urls.length);
      for (let i = 0; i < limit; i++) {
        const sticker = new Sticker(urls[i], {
          pack: "Gabimaru Pack",
          author: "Kunle",
          type: "default",
          quality: 70,
        });
        await sock.sendMessage(from, await sticker.toMessage(), { quoted: msg });
      }
    } catch (e) {
      console.error("[telesticker error]", e.message);
      sock.sendMessage(from, { text: "❌ Failed to fetch sticker pack. Check the link and try again." }, { quoted: msg });
    }
  },
};
