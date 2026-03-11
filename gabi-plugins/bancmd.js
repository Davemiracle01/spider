/**
 * bancmd.js — Ban/Unban users from using bot commands in group
 */
const fs   = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "richstore", "cmdban.json");

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
  command: ["bancmd", "unbancmd", "cmdbanned"],
  description: "Ban/unban a user from using bot commands in this group.",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, commandName }) {
    const db          = loadDB();
    const quotedInfo  = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = quotedInfo?.mentionedJid?.[0];
    const repliedToJid = quotedInfo?.participant;
    const target       = mentionedJid || repliedToJid;

    if (commandName === "cmdbanned") {
      const banned = db[from] || [];
      if (!banned.length) return sock.sendMessage(from, { text: "✅ No users are banned from commands." }, { quoted: msg });
      const list = banned.map(j => `› @${j.split("@")[0]}`).join("\n");
      return sock.sendMessage(from, {
        text: `🚫 *Command-Banned Users*\n\n${list}`,
        mentions: banned
      }, { quoted: msg });
    }

    if (!target) return sock.sendMessage(from, { text: "❌ Mention or reply to a user." }, { quoted: msg });

    if (!db[from]) db[from] = [];

    if (commandName === "bancmd") {
      if (db[from].includes(target)) return sock.sendMessage(from, { text: `⚠️ @${target.split("@")[0]} is already command-banned.`, mentions: [target] }, { quoted: msg });
      db[from].push(target);
      saveDB(db);
      return sock.sendMessage(from, {
        text: `🚫 @${target.split("@")[0]} can no longer use bot commands in this group.`,
        mentions: [target]
      }, { quoted: msg });
    }

    if (commandName === "unbancmd") {
      db[from] = db[from].filter(j => j !== target);
      saveDB(db);
      return sock.sendMessage(from, {
        text: `✅ @${target.split("@")[0]} can now use bot commands again.`,
        mentions: [target]
      }, { quoted: msg });
    }
  },

  isBanned(groupJid, userJid) {
    const db = loadDB();
    return (db[groupJid] || []).includes(userJid);
  }
};
