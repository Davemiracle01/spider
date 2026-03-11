/**
 * delaybug.js — Send delayed messages
 */
module.exports = {
  command: ["delay"],
  description: "Send a delayed message. Usage: .delay <seconds> <message>",
  isOwner: true,

  async run({ sock, msg, from, args }) {
    const seconds = parseInt(args[0]);
    const message = args.slice(1).join(" ");

    if (!seconds || !message || seconds < 1 || seconds > 60) {
      return sock.sendMessage(from, {
        text: "⚠️ Usage: .delay <1-60 seconds> <message>"
      }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: `⏳ Message will be sent in ${seconds} second(s)...` }, { quoted: msg });
    await new Promise(r => setTimeout(r, seconds * 1000));
    await sock.sendMessage(from, { text: message }, { quoted: msg });
  }
};
