/**
 * setbotname.js — Change bot name and settings (owner only)
 */
const fs = require("fs");
const path = require("path");
const settingsPath = path.join(__dirname, "../settings.json");

module.exports = {
  command: ["setbotname", "botname"],
  description: "Change the bot's display name. Usage: .setbotname <name>",
  isOwner: true,

  async run({ sock, msg, from, text }) {
    if (!text) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      return sock.sendMessage(from, {
        text: `🤖 Current bot name: *${settings.botName}*\n\nUsage: *.setbotname <new name>*`
      }, { quoted: msg });
    }

    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    settings.botName = text;
    settings.packname = text;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    await sock.sendMessage(from, {
      text: `✅ Bot name updated to: *${text}*`
    }, { quoted: msg });
  }
};
