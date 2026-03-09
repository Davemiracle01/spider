/**
 * calculator.js — Math calculator
 */
module.exports = {
  command: ["calc", "calculate", "math"],
  description: "Evaluate a math expression. Usage: .calc 2 + 2 * 10",

  async run({ sock, msg, from, text }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: "🧮 Usage: .calc <expression>\n\nExample: .calc (5 + 3) * 2"
      }, { quoted: msg });
    }

    try {
      // Safe eval — only allow numbers and math operators
      if (/[^0-9+\-*/%.() ]/.test(text)) throw new Error("Invalid characters in expression");
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${text})`)();
      if (!isFinite(result)) throw new Error("Result is not finite");
      await sock.sendMessage(from, {
        text: `🧮 *Calculator*\n\n📥 Expression: \`${text}\`\n📤 Result: *${result}*`
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, {
        text: `❌ Invalid expression: *${text}*\n\nOnly math operators: + - * / % ( ) are allowed`
      }, { quoted: msg });
    }
  }
};
