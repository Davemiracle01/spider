/**
 * flip.js — Coin flip
 */
module.exports = {
  command: ["flip", "coinflip", "coin"],
  description: "Flip a coin — heads or tails!",

  async run({ sock, msg, from }) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    const emoji  = result === "Heads" ? "🪙" : "🔄";
    await sock.sendMessage(from, {
      text: `${emoji} *Coin Flip Result:*\n\n*${result}!*`
    }, { quoted: msg });
  }
};
