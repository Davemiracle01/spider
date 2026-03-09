/**
 * antispam.js — Anti-Spam Plugin
 * Warns/kicks users who send too many messages in a short time
 */
const fs   = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "richstore", "antispam.json");
const trackerPath = path.join(__dirname, "..", "richstore", "spamTracker.json");

function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, "{}");
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch { return {}; }
}
function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// In-memory spam tracker: { "group@g.us:sender@s.whatsapp.net": { count, ts } }
const tracker = {};

const LIMIT    = 8;  // messages
const WINDOW   = 8;  // seconds

module.exports = {
  command: ["antispam"],
  description: "Toggle anti-spam protection in a group. Auto-warns spammers.",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, args }) {
    const db     = loadDB();
    const toggle = args[0]?.toLowerCase();

    if (!toggle || !["on", "off"].includes(toggle)) {
      const state = db[from] ? "ON 🟢" : "OFF 🔴";
      return sock.sendMessage(from, {
        text: `🛡️ *Anti-Spam*\n\nCurrent state: *${state}*\n\nUsage:\n› *.antispam on* — Warn users who spam (${LIMIT} msgs/${WINDOW}s)\n› *.antispam off* — Disable`
      }, { quoted: msg });
    }

    if (toggle === "on") {
      db[from] = true;
    } else {
      delete db[from];
    }
    saveDB(db);

    await sock.sendMessage(from, {
      text: `🛡️ Anti-Spam is now *${toggle.toUpperCase()}* ${toggle === "on" ? "🟢" : "🔴"}`
    }, { quoted: msg });
  },

  // Exposed for gabi.js to call on every message
  checkSpam(groupJid, senderJid) {
    const db = loadDB();
    if (!db[groupJid]) return false;

    const key = `${groupJid}:${senderJid}`;
    const now = Date.now();

    if (!tracker[key] || (now - tracker[key].ts) > WINDOW * 1000) {
      tracker[key] = { count: 1, ts: now };
      return false;
    }

    tracker[key].count++;
    return tracker[key].count >= LIMIT;
  },

  loadDB,
};
