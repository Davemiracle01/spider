/**
 * listsudo.js — List all sudo users
 */
const fs = require("fs");
const path = require("path");
const settingsPath = path.join(__dirname, "../settings.json");

module.exports = {
  command: ["listsudo", "sudolist"],
  description: "List all sudo/admin users",
  isOwner: true,

  async run({ sock, msg, from }) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    const sudoList = settings.sudo || [];

    if (!sudoList.length) {
      return sock.sendMessage(from, { text: "📋 No sudo users added yet." }, { quoted: msg });
    }

    const list = sudoList.map((jid, i) => `${i + 1}. @${jid.split("@")[0]}`).join("\n");
    await sock.sendMessage(from, {
      text: `👑 *Sudo Users*\n\n${list}\n\n_Total: ${sudoList.length}_`,
      mentions: sudoList
    }, { quoted: msg });
  }
};
