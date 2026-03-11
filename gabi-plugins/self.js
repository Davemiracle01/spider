const { react01 } = require('../lib/extra');
module.exports = {
  command: ["self"],
  description: "Set bot to self (owner-only) mode",
  isSudo: true,
  
  async run({ msg, sock, from, isOwner }) {
  await react01(sock, from, msg.key, 2000);
//    if (!isOwner) return;
    sock.public = false;
    await sock.sendMessage(from, {
      text: "🔒 Gabimaru is now in self mode."
    }, { quoted: msg });
  }
};