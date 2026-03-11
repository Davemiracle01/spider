const { react01 } = require('../lib/extra');
module.exports = {
  command: ["tagall", "everyone", "all"],
  description: "Mention all group members",
  isGroup: true,
  isSudo: true,
  
  async run({ sock, msg, text, from }) {
await react01(sock, from, msg.key, 2000);
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const message = text || "📢 *Attention everyone!*";

    const mentions = participants.map(p => p.id);
    const list = participants.map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`).join("\n");
    const gcname = metadata.subject;
    const gcmem = participants.length;
    const output = `
╭──❍ *Group Tag*
│ 🏷️ *Group:* ${gcname}
│ 👥 *Members:* ${gcmem}
│ 🗨️ *Message:* ${message}
╰─────────────

${list}
    `.trim();

    await sock.sendMessage(from, {
      text: output,
      mentions
    }, { quoted: {
            key: {
              fromMe: false,
              participant: "0@s.whatsapp.net",
              remoteJid: from
            },
            message: {
              conversation: `Hey ${gcname}`
            }
          }
    });
  }
};