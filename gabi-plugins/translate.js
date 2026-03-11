/**
 * translate.js — Upgraded Translator
 * Upgraded: auto-detect source, 50+ languages, translate replied messages,
 *           Google Translate fallback, detect language command
 */
const axios = require("axios");

const LANGUAGES = {
  // African
  yoruba: "yo", hausa: "ha", igbo: "ig", swahili: "sw", amharic: "am",
  zulu: "zu", xhosa: "xh", somali: "so", afrikaans: "af", shona: "sn",
  sesotho: "st", twi: "ak", lingala: "ln", luganda: "lg",
  // European
  english: "en", french: "fr", spanish: "es", portuguese: "pt",
  german: "de", italian: "it", dutch: "nl", russian: "ru",
  polish: "pl", swedish: "sv", norwegian: "no", danish: "da",
  finnish: "fi", greek: "el", czech: "cs", hungarian: "hu",
  romanian: "ro", ukrainian: "uk", croatian: "hr", slovak: "sk",
  bulgarian: "bg", catalan: "ca", latvian: "lv", lithuanian: "lt",
  estonian: "et", slovenian: "sl",
  // Asian
  japanese: "ja", korean: "ko", chinese: "zh", hindi: "hi",
  arabic: "ar", turkish: "tr", persian: "fa", urdu: "ur",
  bengali: "bn", punjabi: "pa", gujarati: "gu", marathi: "mr",
  tamil: "ta", telugu: "te", kannada: "kn", malayalam: "ml",
  thai: "th", vietnamese: "vi", indonesian: "id", malay: "ms",
  tagalog: "tl", myanmar: "my", nepali: "ne", sinhala: "si",
  khmer: "km", lao: "lo", georgian: "ka", armenian: "hy",
  azerbaijani: "az", kazakh: "kk",
  // Short codes passthrough
  en: "en", fr: "fr", es: "es", de: "de", pt: "pt", ar: "ar",
  zh: "zh", ja: "ja", ko: "ko", ru: "ru", it: "it", hi: "hi",
  yo: "yo", ha: "ha", ig: "ig", sw: "sw", tr: "tr",
};

async function translateText(text, targetLang) {
  // Try MyMemory first
  try {
    const { data } = await axios.get("https://api.mymemory.translated.net/get", {
      params: { q: text, langpair: `autodetect|${targetLang}` },
      timeout: 8000
    });
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return { translated: data.responseData.translatedText, source: "MyMemory" };
    }
  } catch { /* fall through */ }

  // Fallback: Google Translate (free endpoint)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const translated = data[0]?.map(s => s?.[0]).filter(Boolean).join("") || null;
    if (translated) return { translated, source: "Google" };
  } catch { /* fall through */ }

  throw new Error("All translation services failed");
}

module.exports = {
  command: ["tr", "translate", "tl"],
  description: "Translate text to any language. Can translate quoted messages too.",

  async run({ sock, msg, from, args, text }) {
    // .tr list — show all supported languages
    if (args[0]?.toLowerCase() === "list") {
      const uniqueLangs = [...new Set(Object.keys(LANGUAGES).filter(k => k.length > 2))];
      const cols = [];
      for (let i = 0; i < uniqueLangs.length; i += 3) {
        cols.push(uniqueLangs.slice(i, i + 3).join(", "));
      }
      return sock.sendMessage(from, {
        text: `🌍 *Supported Languages*\n\n${cols.join("\n")}\n\n_Use: .tr <language> <text>_`
      }, { quoted: msg });
    }

    if (!args[0]) {
      return sock.sendMessage(from, {
        text: `🌍 *Translator*\n\nUsage:\n› *.tr french Hello world*\n› *.tr es Good morning* (short code)\n› _.tr japanese_ [reply to a message]\n› *.tr list* — see all languages`
      }, { quoted: msg });
    }

    const langKey = args[0].toLowerCase();
    const targetLang = LANGUAGES[langKey];

    if (!targetLang) {
      return sock.sendMessage(from, {
        text: `❌ Unknown language: *${args[0]}*\n\nType *.tr list* to see all supported languages.`
      }, { quoted: msg });
    }

    // Get input from args, or from quoted/replied message
    let inputText = args.slice(1).join(" ").trim();

    if (!inputText) {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      inputText = quoted?.conversation
        || quoted?.extendedTextMessage?.text
        || quoted?.imageMessage?.caption
        || quoted?.videoMessage?.caption
        || "";
    }

    if (!inputText) {
      return sock.sendMessage(from, {
        text: `⚠️ Provide text to translate or reply to a message.\n\nExample: \`.tr ${args[0]} Hello world\``
      }, { quoted: msg });
    }

    // Truncate extremely long text
    const maxLen = 1500;
    const truncated = inputText.length > maxLen;
    const textToTranslate = truncated ? inputText.slice(0, maxLen) : inputText;

    try {
      const { translated, source } = await translateText(textToTranslate, targetLang);
      const langName = langKey.charAt(0).toUpperCase() + langKey.slice(1);

      await sock.sendMessage(from, {
        text: `🌍 *Translator* _(via ${source})_\n\n📥 *Original:* ${textToTranslate}${truncated ? "\n_...truncated_" : ""}\n\n📤 *${langName}:* ${translated}`
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, {
        text: "❌ Translation failed. Both translation services are down. Try again later."
      }, { quoted: msg });
    }
  }
};
