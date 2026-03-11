const fs = require("fs");
const path = require("path");
const settingsPath = path.join(__dirname, "../settings.json");
const { react01 } = require('../lib/extra');

module.exports = {
  command: ["listsudo"],
  description: "List all sudo users",
  isSudo: true,

  async run({ msg, sock, from }) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    await react01(sock, from, msg.key, 2000);

    if (!settings.sudo || !settings.sudo.length) {
      return sock.sendMessage(from, { text: "⚠️ No sudo users found." }, { quoted: msg });
    }

    const list = settings.sudo.map((jid, i) => `${i + 1}. @${jid.split("@")[0]}`).join("\n");
    sock.sendMessage(from, {
      text: `👑 *Sudo Users*\n\n${list}\n\n_Total: ${settings.sudo.length}_`,
      mentions: settings.sudo
    }, { quoted: msg });
  }
};
