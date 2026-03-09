module.exports = {
  command: ["tagall", "everyone", "all"],
  description: "Mention all group members",
  isGroup: true,
  isAdmin: true,
  
  async run({ sock, msg, text, from }) {

    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants || [];
    const message = text || "📢 *Attention everyone!*";

    const mentions = participants.map(p => p.id);
    const list = participants.map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`).join("\n");

    const output = `
╭──❍ *Group Tag*
│ 🏷️ *Group:* ${metadata.subject}
│ 👥 *Members:* ${participants.length}
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
              conversation: "🤺 TAG ALL"
            }
          }
    });
  }
};