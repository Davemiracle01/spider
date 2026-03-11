const fs = require("fs");
const path = require("path");
const settingsPath = path.join(__dirname, "../settings.json");
const { react01 } = require('../lib/extra');

module.exports = {
  command: ["delsudo"],
  description: "Remove a number from sudo list",
  isSudo: true,

  async run({ msg, sock, from }) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const quotedInfo = msg.message.extendedTextMessage?.contextInfo;
    const mentionedJid = quotedInfo?.mentionedJid?.[0];
    const repliedToJid = quotedInfo?.participant;
    const targetJid = mentionedJid || repliedToJid;

    if (!targetJid) {
      return sock.sendMessage(from, { text: "❌ @mention or reply to the user to remove from sudo." }, { quoted: msg });
    }

    if (!settings.sudo?.includes(targetJid)) {
      return sock.sendMessage(from, { text: "⚠️ Number not found in sudo list." }, { quoted: msg });
    }

    settings.sudo = settings.sudo.filter(user => user !== targetJid);
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    await react01(sock, from, msg.key, 2000);
    return sock.sendMessage(from, {
      text: `✅ Removed @${targetJid.split("@")[0]} from sudo list.`,
      mentions: [targetJid]
    }, { quoted: msg });
  }
};
