/**
 * antimentionstatus.js — Anti Mention Status Plugin
 * Prevents bot from being tagged/mentioned in statuses & auto-replies
 */
const fs   = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "richstore", "antimentionstatus.json");

function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, "{}");
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch { return {}; }
}
function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  command: ["antimentionstatus", "ams"],
  description: "Toggle auto-reply when someone mentions the bot in their status.",
  isOwner: true,

  async run({ sock, msg, from, args }) {
    const db     = loadDB();
    const toggle = args[0]?.toLowerCase();
    const KEY    = "global";

    if (!toggle || !["on", "off"].includes(toggle)) {
      const state = db[KEY] ? "ON 🟢" : "OFF 🔴";
      return sock.sendMessage(from, {
        text: `📢 *Anti-Mention Status*\n\nCurrent state: *${state}*\n\nUsage:\n› *.ams on* — Auto-reply when bot is mentioned in status\n› *.ams off* — Disable`
      }, { quoted: msg });
    }

    if (toggle === "on") {
      db[KEY] = true;
    } else {
      delete db[KEY];
    }
    saveDB(db);

    await sock.sendMessage(from, {
      text: `📢 Anti-Mention Status is now *${toggle.toUpperCase()}* ${toggle === "on" ? "🟢" : "🔴"}`
    }, { quoted: msg });
  },

  loadDB,
};
