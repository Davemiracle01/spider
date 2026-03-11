const fs = require("fs");
const path = require("path");
const settingsPath = path.join(__dirname, "../settings.json");
const { react01 } = require('../lib/extra');

module.exports = {
  command: ["addsudo"],
  description: "Add a number to sudo list",
  isSudo: true,

  async run({ msg, sock, from }) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const quotedInfo = msg.message.extendedTextMessage?.contextInfo;
    const mentionedJid = quotedInfo?.mentionedJid?.[0];
    const repliedToJid = quotedInfo?.participant;
    const targetJid = mentionedJid || repliedToJid;

    if (!targetJid) {
      return sock.sendMessage(from, { text: "❌ @mention or reply to the user you want to add as sudo." }, { quoted: msg });
    }

    if (!settings.sudo) settings.sudo = [];
    if (settings.sudo.includes(targetJid)) {
      return sock.sendMessage(from, { text: "⚠️ Number already exists in sudo list." }, { quoted: msg });
    }

    settings.sudo.push(targetJid);
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    await react01(sock, from, msg.key, 2000);
    return sock.sendMessage(from, {
      text: `✅ Added @${targetJid.split("@")[0]} to sudo list.`,
      mentions: [targetJid]
    }, { quoted: msg });
  }
};
