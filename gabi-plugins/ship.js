/**
 * ship.js — Compatibility meter
 */
module.exports = {
  command: ["ship"],
  description: "Check compatibility between two people. Usage: .ship @user1 @user2 or .ship Name1 Name2",

  async run({ sock, msg, from, args, text }) {
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
    const mentions   = quotedInfo?.mentionedJid || [];

    let name1, name2;

    if (mentions.length >= 2) {
      name1 = mentions[0].split("@")[0];
      name2 = mentions[1].split("@")[0];
    } else if (mentions.length === 1) {
      name1 = msg.pushName || "You";
      name2 = mentions[0].split("@")[0];
    } else if (args.length >= 2) {
      name1 = args[0];
      name2 = args[1];
    } else {
      return sock.sendMessage(from, {
        text: "💞 Usage: .ship @user1 @user2\nOr: .ship Name1 Name2"
      }, { quoted: msg });
    }

    const score = Math.floor(Math.random() * 101);
    const bar = "❤️".repeat(Math.floor(score / 10)) + "🖤".repeat(10 - Math.floor(score / 10));
    const emoji = score >= 80 ? "💘" : score >= 50 ? "💞" : score >= 30 ? "💛" : "💔";

    await sock.sendMessage(from, {
      text: `${emoji} *Ship Meter*\n\n👤 ${name1} + ${name2}\n\n${bar}\n\n🔢 Score: *${score}%*\n\n${getShipComment(score)}`
    }, { quoted: msg });
  }
};

function getShipComment(score) {
  if (score >= 90) return "_Soulmates! 🔥 The universe ships it!_";
  if (score >= 70) return "_Great match! ❤️ Could be something special._";
  if (score >= 50) return "_Not bad! 💛 Give it a chance._";
  if (score >= 30) return "_It's complicated... 😅_";
  return "_The symbiote says no. 💀_";
}
