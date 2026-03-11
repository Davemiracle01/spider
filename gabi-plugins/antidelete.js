/**
 * antidelete.js — Anti-Delete Plugin
 * Resends deleted messages back to the chat
 */
const fs   = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "richstore", "antidelete.json");

function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, "{}");
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch { return {}; }
}
function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Toggle command
module.exports = {
  command: ["antidelete", "antidel"],
  description: "Toggle anti-delete in a group. Bot resends deleted messages.",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, args }) {
    const db     = loadDB();
    const toggle = args[0]?.toLowerCase();

    if (!toggle || !["on", "off"].includes(toggle)) {
      const state = db[from] ? "ON 🟢" : "OFF 🔴";
      return sock.sendMessage(from, {
        text: `🗑️ *Anti-Delete*\n\nCurrent state: *${state}*\n\nUsage:\n› *.antidelete on* — Catch deleted messages\n› *.antidelete off* — Disable`
      }, { quoted: msg });
    }

    if (toggle === "on") {
      db[from] = true;
    } else {
      delete db[from];
    }
    saveDB(db);

    await sock.sendMessage(from, {
      text: `🗑️ Anti-Delete is now *${toggle.toUpperCase()}* ${toggle === "on" ? "🟢" : "🔴"}\n\n${toggle === "on" ? "Deleted messages will be resent by the bot." : "Deleted messages will no longer be resent."}`
    }, { quoted: msg });
  },

  // Called from the message delete event handler (gabi.js integration)
  loadDB,
};
