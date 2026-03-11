/**
 * bugreport.js — Bug Report Command
 * Sends bug reports directly to bot owners
 */
const OWNER_NUMBERS = ["254769279076", "254799073744"];

module.exports = {
  command: ["bugreport", "bug", "report"],
  description: "Report a bug to the bot owners. Usage: .bugreport <describe the bug>",

  async run({ sock, msg, from, sender, senderNumber, text, settings }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: `🐛 *Bug Report*\n\nUsage: *.bugreport <describe the issue>*\n\nExample:\n_.bugreport .weather command crashes when I type .weather_`
      }, { quoted: msg });
    }

    const now = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" });
    const reportMsg =
`🐛 *BUG REPORT RECEIVED*
━━━━━━━━━━━━━━━━━━━━
👤 *Reporter:* @${senderNumber}
📍 *Chat:* ${from}
🕒 *Time:* ${now}
━━━━━━━━━━━━━━━━━━━━
📋 *Report:*
${text}
━━━━━━━━━━━━━━━━━━━━
_Sent via .bugreport command_`;

    let sent = 0;
    for (const ownerNum of OWNER_NUMBERS) {
      try {
        await sock.sendMessage(`${ownerNum}@s.whatsapp.net`, {
          text: reportMsg,
          mentions: [sender]
        });
        sent++;
      } catch {}
    }

    await sock.sendMessage(from, {
      text: `✅ *Bug report sent!*\n\nThank you @${senderNumber} for the report. The owners have been notified and will fix it soon. 🙏`,
      mentions: [sender]
    }, { quoted: msg });
  }
};
