const fs = require("fs");
const path = require("path");
const { react01 } = require('../lib/extra');

module.exports = {
  command: ["getplugin", "fetchplugin"],
  description: "Get the source code of a plugin as a file",
  isSudo: true,

  async run({ sock, msg, from, args }) {
    try {
      await react01(sock, from, msg.key, 1500);

      if (!args[0]) {
        return sock.sendMessage(from, { text: "⚠️ Usage: .getplugin <pluginname>" }, { quoted: msg });
      }

      const pluginName = args[0].toLowerCase().replace(/\.js$/, '');
      const pluginPath = path.join(__dirname, `${pluginName}.js`);

      if (!fs.existsSync(pluginPath)) {
        return sock.sendMessage(from, { text: `❌ Plugin '${pluginName}' not found.` }, { quoted: msg });
      }

      const fileBuffer = fs.readFileSync(pluginPath);

      await sock.sendMessage(from, {
        document: fileBuffer,
        mimetype: "application/javascript",
        fileName: `${pluginName}.js`,
        caption: `📦 Plugin: *${pluginName}.js*`
      }, { quoted: msg });

    } catch (err) {
      console.error("GetPlugin error:", err);
      return sock.sendMessage(from, { text: "❌ Failed to send plugin file." }, { quoted: msg });
    }
  }
};
