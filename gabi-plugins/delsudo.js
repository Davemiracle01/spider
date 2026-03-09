const fs = require("fs");
const path = require("path");
const settingsPath = path.join(__dirname, "../settings.json");

module.exports = {
  command: ["delsudo"],
  description: "Remove a user from the sudo list (owner only)",
  isSudo: true,

  async run({ msg, sock, from }) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const quotedInfo   = msg.message.extendedTextMessage?.contextInfo;
    const mentionedJid = quotedInfo?.mentionedJid?.[0];
    const repliedToJid = quotedInfo?.participant;
    const targetJid    = mentionedJid || repliedToJid;

    if (!targetJid) {
      return sock.sendMessage(from, { text: "❌ @mention or reply to the user you want to remove from sudo." }, { quoted: msg });
    }

    if (!settings.sudo?.includes(targetJid)) {
      return sock.sendMessage(from, { text: "⚠️ That user is not in the sudo list." }, { quoted: msg });
    }

    settings.sudo = settings.sudo.filter((j) => j !== targetJid);
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    return sock.sendMessage(from, {
      text: `✅ Removed @${targetJid.split("@")[0]} from sudo list.`,
      mentions: [targetJid],
    }, { quoted: msg });
  },
};
