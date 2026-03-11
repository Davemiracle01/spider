/**
 * calculator.js — Advanced Math Calculator
 * Upgraded: full scientific math, constants, conversion, history
 */
const mathHistory = {}; // in-memory per-user history

function safeEval(expr) {
  let cleaned = expr
    .replace(/\bpi\b/gi, `(${Math.PI})`)
    .replace(/\bphi\b/gi, `(${(1 + Math.sqrt(5)) / 2})`)
    .replace(/\be\b/g, `(${Math.E})`)
    .replace(/\bsqrt\(/gi, "Math.sqrt(")
    .replace(/\bcbrt\(/gi, "Math.cbrt(")
    .replace(/\babs\(/gi, "Math.abs(")
    .replace(/\bfloor\(/gi, "Math.floor(")
    .replace(/\bceil\(/gi, "Math.ceil(")
    .replace(/\bround\(/gi, "Math.round(")
    .replace(/\blog10\(/gi, "Math.log10(")
    .replace(/\blog2\(/gi, "Math.log2(")
    .replace(/\blog\(/gi, "Math.log(")
    .replace(/\bsin\(/gi, "Math.sin(")
    .replace(/\bcos\(/gi, "Math.cos(")
    .replace(/\btan\(/gi, "Math.tan(")
    .replace(/\basin\(/gi, "Math.asin(")
    .replace(/\bacos\(/gi, "Math.acos(")
    .replace(/\batan\(/gi, "Math.atan(")
    .replace(/\bpow\(/gi, "Math.pow(")
    .replace(/\bmax\(/gi, "Math.max(")
    .replace(/\bmin\(/gi, "Math.min(")
    .replace(/\^/g, "**");

  // Block unsafe
  if (/[^0-9+\-*/%.() ,Math.a-z_\s]/.test(cleaned.replace(/Math\.\w+/g, "").replace(/\(|\)/g, ""))) {
    throw new Error("Invalid characters");
  }

  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${cleaned})`)();
  if (typeof result !== "number" || !isFinite(result)) throw new Error("Result is not a finite number");
  return result;
}

module.exports = {
  command: ["calc", "calculate", "math", "solve"],
  description: "Advanced calculator with scientific functions, constants, and history.",

  async run({ sock, msg, from, text, sender }) {
    const userId = sender || from;

    if (!text || text.trim() === "help") {
      return sock.sendMessage(from, {
        text:
`🧮 *Advanced Calculator*

*Basic:* \`.calc 5 + 3 * (2 - 1)\`
*Powers:* \`.calc 2^10\` or \`.calc pow(2,10)\`
*Roots:* \`.calc sqrt(144)\` or \`.calc cbrt(27)\`
*Trig:* \`.calc sin(pi/2)\` \`.calc cos(0)\` \`.calc tan(pi/4)\`
*Logs:* \`.calc log(e)\` \`.calc log10(1000)\` \`.calc log2(64)\`
*Rounding:* \`.calc floor(3.9)\` \`.calc ceil(2.1)\`
*Constants:* \`pi\`, \`e\`, \`phi\` (golden ratio)
*Range:* \`.calc max(5,3,9)\` \`.calc min(4,7,2)\`
*History:* \`.calc history\`
*Clear:* \`.calc clear\``
      }, { quoted: msg });
    }

    if (text.trim().toLowerCase() === "history") {
      const hist = mathHistory[userId];
      if (!hist || !hist.length) return sock.sendMessage(from, { text: "📜 No calculation history yet." }, { quoted: msg });
      const display = hist.slice(-10).map((h, i) => `${i + 1}. \`${h.expr}\` = *${h.result}*`).join("\n");
      return sock.sendMessage(from, { text: `📜 *Calc History (last 10)*\n\n${display}` }, { quoted: msg });
    }

    if (text.trim().toLowerCase() === "clear") {
      mathHistory[userId] = [];
      return sock.sendMessage(from, { text: "🗑️ Calculation history cleared." }, { quoted: msg });
    }

    try {
      const result = safeEval(text.trim());
      const formatted = Number.isInteger(result) ? result : parseFloat(result.toPrecision(12));

      if (!mathHistory[userId]) mathHistory[userId] = [];
      mathHistory[userId].push({ expr: text.trim(), result: formatted });
      if (mathHistory[userId].length > 50) mathHistory[userId].shift();

      await sock.sendMessage(from, {
        text: `🧮 *Calculator*\n\n📥 Expression: \`${text}\`\n📤 Result: *${formatted}*`
      }, { quoted: msg });
    } catch {
      await sock.sendMessage(from, {
        text: `❌ *Invalid expression:* \`${text}\`\n\nType \`.calc help\` for supported functions.`
      }, { quoted: msg });
    }
  }
};
