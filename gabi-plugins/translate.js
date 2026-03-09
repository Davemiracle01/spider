const axios = require("axios");

const langCodes = {
  english: "en", en: "en",
  yoruba: "yo", yo: "yo",
  hausa: "ha", ha: "ha",
  igbo: "ig", ig: "ig",
  french: "fr", fr: "fr",
  spanish: "es", es: "es",
  arabic: "ar", ar: "ar",
  portuguese: "pt", pt: "pt",
  german: "de", de: "de",
  japanese: "ja", ja: "ja",
  korean: "ko", ko: "ko",
  chinese: "zh", zh: "zh",
  russian: "ru", ru: "ru",
  swahili: "sw", sw: "sw",
  italian: "it", it: "it",
  turkish: "tr", tr: "tr",
  hindi: "hi", hi: "hi",
  amharic: "am", am: "am",
};

module.exports = {
  command: ["tr", "translate"],
  description: "Translate text. Usage: .tr <lang> <text>  e.g. .tr french Hello world",

  async run({ sock, msg, from, args, text }) {
    if (!args[0] || !args[1]) {
      return sock.sendMessage(from, {
        text: "⚠️ Usage: `.tr <language> <text>`\n\nExample: `.tr french Good morning`\n\nSupported: English, French, Spanish, Yoruba, Hausa, Igbo, Arabic, Swahili, German, Japanese, Korean, Chinese, Russian, Italian, Turkish, Hindi, Portuguese..."
      }, { quoted: msg });
    }

    const langKey = args[0].toLowerCase();
    const targetLang = langCodes[langKey];

    if (!targetLang) {
      return sock.sendMessage(from, {
        text: `❌ Unknown language: *${args[0]}*\n\nTry: english, french, spanish, yoruba, hausa, igbo, arabic, swahili, japanese, korean...`
      }, { quoted: msg });
    }

    const inputText = args.slice(1).join(" ");

    try {
      const { data } = await axios.get("https://api.mymemory.translated.net/get", {
        params: {
          q: inputText,
          langpair: `auto|${targetLang}`
        },
        timeout: 8000
      });

      const translated = data?.responseData?.translatedText;
      if (!translated || data.responseStatus !== 200) throw new Error("Translation failed");

      await sock.sendMessage(from, {
        text: `🌍 *Translator*\n\n📥 Original: ${inputText}\n📤 ${args[0].charAt(0).toUpperCase() + args[0].slice(1)}: *${translated}*`
      }, { quoted: msg });

    } catch (err) {
      console.error("Translate error:", err.message);
      await sock.sendMessage(from, {
        text: "❌ Translation failed. Try again later."
      }, { quoted: msg });
    }
  }
};
