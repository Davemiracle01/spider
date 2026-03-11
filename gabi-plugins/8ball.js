/**
 * 8ball.js — Upgraded Magic 8-Ball
 * Upgraded: thematic response packs (mystical, savage, anime), 
 *           confidence meter, question history, daily fortune
 */
const fs   = require("fs");
const path = require("path");
const histPath = path.join(__dirname, "..", "richstore", "8ball_history.json");

function loadHistory()  { try { if (!fs.existsSync(histPath)) fs.writeFileSync(histPath, "{}"); return JSON.parse(fs.readFileSync(histPath, "utf8")); } catch { return {}; } }
function saveHistory(d) { fs.writeFileSync(histPath, JSON.stringify(d, null, 2)); }

const PACKS = {
  mystical: {
    positive: [
      { text: "The cosmos align in your favor.", emoji: "🌌" },
      { text: "The stars have spoken — yes.", emoji: "⭐" },
      { text: "Your aura radiates success.", emoji: "✨" },
      { text: "The ancient spirits say: proceed.", emoji: "🔮" },
      { text: "The universe bends to your will.", emoji: "🌠" },
    ],
    neutral: [
      { text: "The mists of fate are unclear.", emoji: "🌫️" },
      { text: "The oracle demands more information.", emoji: "📿" },
      { text: "The fates are still debating.", emoji: "⚖️" },
      { text: "Ask when the moon is full.", emoji: "🌙" },
    ],
    negative: [
      { text: "The shadows say... no.", emoji: "🖤" },
      { text: "Dark omens surround this question.", emoji: "🦇" },
      { text: "The oracle laughs. No.", emoji: "💀" },
    ],
  },
  savage: {
    positive: [
      { text: "Yeah, obviously. Why even ask?", emoji: "💅" },
      { text: "Yes, and that's on period.", emoji: "✅" },
      { text: "The audacity to ask, but yes.", emoji: "👏" },
      { text: "Congrats, the universe bothered to say yes.", emoji: "🏆" },
    ],
    neutral: [
      { text: "Maybe. Do better and ask again.", emoji: "🙄" },
      { text: "Unclear. Probably a skill issue.", emoji: "😭" },
      { text: "Let me think... nah still unclear.", emoji: "🤔" },
    ],
    negative: [
      { text: "No, and you should be embarrassed for asking.", emoji: "💀" },
      { text: "Absolutely not. The audacity.", emoji: "😤" },
      { text: "Not even in an alternate timeline.", emoji: "🚫" },
      { text: "Sir/Ma'am... no.", emoji: "😭" },
    ],
  },
  anime: {
    positive: [
      { text: "Yosh! The path is clear — go for it!", emoji: "🔥" },
      { text: "This is your power arc. Yes.", emoji: "⚡" },
      { text: "PLUS ULTRA! Definitely yes.", emoji: "💪" },
      { text: "The protagonist energy says yes.", emoji: "🌟" },
    ],
    neutral: [
      { text: "Even Senku can't calculate this yet.", emoji: "🧪" },
      { text: "The answer is hidden in a filler arc.", emoji: "📺" },
      { text: "Ask again after your training arc.", emoji: "🥋" },
    ],
    negative: [
      { text: "The plot armor won't save you this time. No.", emoji: "⚔️" },
      { text: "This is not your arc. No.", emoji: "😤" },
      { text: "NPC energy detected. No.", emoji: "💔" },
    ],
  },
};

const CLASSIC = {
  positive: [
    { text: "It is certain.", emoji: "✅" },
    { text: "It is decidedly so.", emoji: "✅" },
    { text: "Without a doubt.", emoji: "✅" },
    { text: "Yes, definitely.", emoji: "✅" },
    { text: "Most likely.", emoji: "✅" },
    { text: "Outlook good.", emoji: "✅" },
    { text: "Signs point to yes.", emoji: "✅" },
  ],
  neutral: [
    { text: "Reply hazy, try again.", emoji: "🔮" },
    { text: "Ask again later.", emoji: "🔮" },
    { text: "Cannot predict now.", emoji: "🔮" },
    { text: "Concentrate and ask again.", emoji: "🔮" },
  ],
  negative: [
    { text: "Don't count on it.", emoji: "❌" },
    { text: "My reply is no.", emoji: "❌" },
    { text: "Outlook not so good.", emoji: "❌" },
    { text: "Very doubtful.", emoji: "❌" },
  ],
};

function pickResponse(pack) {
  const r = Math.random();
  const bucket = r < 0.55 ? pack.positive : r < 0.80 ? pack.neutral : pack.negative;
  return bucket[Math.floor(Math.random() * bucket.length)];
}

function getConfidence(pick, pack) {
  if (pack.positive.includes(pick)) return Math.floor(60 + Math.random() * 40);
  if (pack.neutral.includes(pick))  return Math.floor(30 + Math.random() * 30);
  return Math.floor(5 + Math.random() * 30);
}

module.exports = {
  command: ["8ball", "magic", "oracle", "fortune"],
  description: "Magic 8-Ball. Modes: mystical, savage, anime. Usage: .8ball [mode] <question>",

  async run({ sock, msg, from, text, args, sender }) {
    const userId = sender || from;

    if (!text || text.trim() === "history") {
      const history = loadHistory();
      if (text?.trim() === "history") {
        const hist = history[userId];
        if (!hist || !hist.length) return sock.sendMessage(from, { text: "🔮 No question history yet." }, { quoted: msg });
        const display = hist.slice(-5).map((h, i) => `${i+1}. _"${h.q}"_ → ${h.emoji} ${h.a}`).join("\n");
        return sock.sendMessage(from, { text: `📜 *Your Last Questions*\n\n${display}` }, { quoted: msg });
      }
      return sock.sendMessage(from, {
        text:
`🎱 *Magic 8-Ball*

Usage:
› *.8ball Will I be rich?*
› *.8ball mystical Am I destined for greatness?*
› *.8ball savage Should I text them?*
› *.8ball anime Is this my arc?*
› *.8ball history* — your last 5 questions`
      }, { quoted: msg });
    }

    // Detect mode
    let mode = "classic";
    let question = text.trim();

    const modeMatch = Object.keys(PACKS).find(m => question.toLowerCase().startsWith(m + " "));
    if (modeMatch) {
      mode     = modeMatch;
      question = question.slice(modeMatch.length).trim();
    }

    const pack = PACKS[mode] || CLASSIC;
    const pick = pickResponse(pack);
    const conf = getConfidence(pick, pack);
    const bar  = "█".repeat(Math.floor(conf / 10)) + "░".repeat(10 - Math.floor(conf / 10));

    // Track history
    const history = loadHistory();
    if (!history[userId]) history[userId] = [];
    history[userId].push({ q: question.slice(0, 80), a: pick.text, emoji: pick.emoji, at: Date.now() });
    if (history[userId].length > 20) history[userId].shift();
    saveHistory(history);

    const modeLabel = mode !== "classic" ? ` _(${mode} mode)_` : "";
    await sock.sendMessage(from, {
      text: `🎱 *Magic 8-Ball*${modeLabel}\n\n❓ *Q:* ${question}\n\n${pick.emoji} *A:* _${pick.text}_\n\n📊 Confidence: ${conf}%\n\`${bar}\``
    }, { quoted: msg });
  }
};
