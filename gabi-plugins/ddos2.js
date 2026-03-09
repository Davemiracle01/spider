/**
 * ddos2.js — Sticker flood (owner only, testing tool)
 * RESTRICTED: Owner/Dev only
 */
const fs = require("fs");
const path = require("path");

module.exports = {
  command: ["ddos2"],
  description: "Send multiple stickers rapidly (owner only). Usage: .ddos2 <count>",
  isOwner: true,

  async run({ sock, msg, from, args }) {
    const count = Math.min(parseInt(args[0]) || 3, 10);
    const outputFolder = path.join(__dirname, "../stick_output");

    let stickers = [];
    try { stickers = fs.readdirSync(outputFolder).filter(f => f.endsWith(".webp")); } catch {}

    if (!stickers.length) {
      return sock.sendMessage(from, { text: "⚠️ No stickers found in stick_output folder." }, { quoted: msg });
    }

    for (let i = 0; i < count; i++) {
      const pick = stickers[Math.floor(Math.random() * stickers.length)];
      await sock.sendMessage(from, { sticker: fs.readFileSync(path.join(outputFolder, pick)) });
      await new Promise(r => setTimeout(r, 500));
    }
  }
};
