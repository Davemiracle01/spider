/**
 * ddos.js — Mass message (owner only, testing tool)
 * RESTRICTED: Owner/Dev only
 */
module.exports = {
  command: ["ddos"],
  description: "Send multiple messages (owner only). Usage: .ddos <count> <message>",
  isOwner: true,

  async run({ sock, msg, from, args, text }) {
    const count = parseInt(args[0]);
    const message = args.slice(1).join(" ");

    if (!count || !message || count < 1 || count > 20) {
      return sock.sendMessage(from, {
        text: "⚠️ Usage: .ddos <count 1-20> <message>\n\nExample: .ddos 5 Hello!"
      }, { quoted: msg });
    }

    for (let i = 0; i < count; i++) {
      await sock.sendMessage(from, { text: message }, { quoted: msg });
      await new Promise(r => setTimeout(r, 600));
    }
  }
};
