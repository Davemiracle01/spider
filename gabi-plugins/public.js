const { react01 } = require('../lib/extra');
module.exports = {
  command: ["public"],
  description: "Set bot to public mode",
  isSudo: true,

  async run({ msg, sock, from, isOwner }) {
  await react01(sock, from, msg.key, 2000);
//    if (!isOwner) return;
    sock.public = true;
    await sock.sendMessage(from, {
      text: "✅ Bot is now in public mode."
    }, { quoted: msg });
  }
};