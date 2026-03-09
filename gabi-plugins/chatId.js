/**
 * chatId.js — Get the JID of the current chat
 */
module.exports = {
  command: ["chatid", "jid", "id"],
  description: "Get the JID (ID) of the current chat or group",

  async run({ sock, msg, from, sender }) {
    await sock.sendMessage(from, {
      text: `📋 *Chat Info*\n\n🆔 *Chat JID:* \`${from}\`\n👤 *Your JID:* \`${sender}\``
    }, { quoted: msg });
  }
};
