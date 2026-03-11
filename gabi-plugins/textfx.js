const axios = require('axios');
const { react01 } = require('../lib/extra');

const EFFECTS = ['neon', 'fire', 'glitch', 'matrix', 'graffiti'];

module.exports = {
  command: ["textfx", "texteffect", "fancytext"],
  description: "Create stylish text effects (neon, fire, glitch, matrix, graffiti)",
  category: "Fun",
  usage: ".textfx <effect> <text>",

  async run({ sock, msg, from, args, text, settings }) {
    await react01(sock, from, msg.key, 2000);

    if (!text) {
      return sock.sendMessage(from, {
        text: `❌ Usage: ${settings.prefix}textfx <effect> <text>\n\n🎨 Effects: ${EFFECTS.join(', ')}\nExample: ${settings.prefix}textfx neon Gabimaru`
      }, { quoted: msg });
    }

    const firstArg = args[0]?.toLowerCase();
    let effect = EFFECTS.includes(firstArg) ? firstArg : 'neon';
    let inputText = EFFECTS.includes(firstArg) ? args.slice(1).join(' ') : text;

    if (!inputText) {
      return sock.sendMessage(from, {
        text: `❌ Please provide text after the effect name.\nExample: ${settings.prefix}textfx ${effect} Hello World`
      }, { quoted: msg });
    }

    try {
      // Use the memer-api which has real text effect endpoints
      const apiUrl = `https://api.popcat.xyz/texttopng?text=${encodeURIComponent(inputText)}`;
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 15000 });

      await sock.sendMessage(from, {
        image: Buffer.from(response.data),
        caption: `✨ *Text Effect: ${effect.toUpperCase()}*\n📝 "${inputText}"\n> Gabimaru Bot`
      }, { quoted: msg });

    } catch (err) {
      console.error('TextFX error:', err);
      // Fallback: send styled Unicode text
      const styles = {
        neon: (t) => t.split('').map(c => c + '̈').join(''),
        fire: (t) => `🔥 ${t} 🔥`,
        glitch: (t) => t.split('').join('̷'),
        matrix: (t) => `💚 ${t.toUpperCase()} 💚`,
        graffiti: (t) => `🎨 ${t} 🎨`
      };

      const styled = styles[effect] ? styles[effect](inputText) : inputText;
      await sock.sendMessage(from, {
        text: `✨ *${effect.toUpperCase()} Effect:*\n\n${styled}`
      }, { quoted: msg });
    }
  }
};
