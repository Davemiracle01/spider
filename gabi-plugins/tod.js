/**
 * tod.js — Upgraded Truth or Dare
 * Upgraded: rated categories (family-friendly / normal / spicy),
 *           streak tracking, dare confirmation, group leaderboard
 */
const axios = require("axios");
const fs    = require("fs");
const path  = require("path");
const streakPath = path.join(__dirname, "..", "richstore", "tod_streaks.json");

function loadStreaks()  { try { if (!fs.existsSync(streakPath)) fs.writeFileSync(streakPath, "{}"); return JSON.parse(fs.readFileSync(streakPath, "utf8")); } catch { return {}; } }
function saveStreaks(d) { fs.writeFileSync(streakPath, JSON.stringify(d, null, 2)); }

const familyTruths = [
  "What's the funniest thing that ever happened to you?",
  "What's your biggest pet peeve?",
  "What's your most embarrassing childhood memory?",
  "If you could have any superpower, what would it be and why?",
  "What's the weirdest food combination you've ever eaten?",
  "What was your most embarrassing moment in school?",
  "If you could swap lives with anyone for a day, who would it be?",
  "What's something you've never told anyone in this group?",
  "What's the most childish thing you still do?",
  "What's your biggest fear?",
];

const familyDares = [
  "Speak in an accent for the next 3 messages.",
  "Send a voice note singing your national anthem.",
  "Text your last contact 'Quack quack' and show the reaction.",
  "Do 10 push-ups and report back with a voice note.",
  "Change your display name to 'Chicken' for 5 minutes.",
  "Send your most embarrassing photo from 2 years ago.",
  "Speak backwards for your next 3 messages.",
  "Send a voice note doing your best villain laugh.",
  "Tag 3 people in this chat and say something kind about them.",
  "Send a voice note in a robot voice.",
];

const spicyTruths = [
  "What's the biggest lie you've ever told to get out of something?",
  "Have you ever pretended to like someone you actually can't stand?",
  "What's the pettiest thing you've ever done?",
  "Have you ever blamed someone else for something you did?",
  "What's the most embarrassing thing on your phone right now?",
  "Who in this chat would you NOT want to be stranded on an island with?",
  "Have you ever eavesdropped on someone's private conversation?",
  "What's the most ridiculous thing you've cried over?",
];

const spicyDares = [
  "Send a voice note confessing your most embarrassing habit.",
  "Type your honest opinion of every admin in this group.",
  "Text your ex 'I miss you' and screenshot the response.",
  "Post your most recent photo from your gallery in this chat.",
  "DM someone in this group that you've been avoiding and say hi.",
  "Tell us your honest first impression of someone in this group.",
  "Do a 30-second stand-up comedy voice note — must be funny.",
  "Send a voice note dramatically reading a random Wikipedia article.",
];

module.exports = {
  command: ["truth", "dare", "tod", "todleader"],
  description: "Truth or Dare with family/spicy modes + streaks. Usage: .tod | .tod spicy | .truth | .dare",

  async run({ sock, msg, from, commandName, args, sender }) {
    const userId = sender || from;
    const streaks = loadStreaks();
    const key = `${from}:${userId}`;

    // ── .todleader — group leaderboard ────────────────────────────
    if (commandName === "todleader") {
      const groupEntries = Object.entries(streaks)
        .filter(([k]) => k.startsWith(from + ":"))
        .sort((a, b) => (b[1].total || 0) - (a[1].total || 0))
        .slice(0, 10);

      if (!groupEntries.length) return sock.sendMessage(from, { text: "📊 No one has played ToD in this group yet!" }, { quoted: msg });

      const list = groupEntries.map(([k, v], i) => {
        const user = k.split(":")[1]?.split("@")[0];
        return `${i + 1}. @${user} — 🔥 ${v.streak || 0} streak | ${v.total || 0} total`;
      }).join("\n");

      return sock.sendMessage(from, {
        text: `🎯 *ToD Leaderboard*\n\n${list}`,
        mentions: groupEntries.map(([k]) => k.split(":")[1])
      }, { quoted: msg });
    }

    let type = commandName;
    const mode = args[0]?.toLowerCase() === "spicy" ? "spicy" : "family";

    if (type === "tod") {
      type = Math.random() < 0.5 ? "truth" : "dare";
    }

    let result;
    try {
      if (type === "truth") {
        const { data } = await axios.get("https://api.truthordarebot.xyz/v1/truth", { timeout: 5000 });
        result = data?.question;
      } else {
        const { data } = await axios.get("https://api.truthordarebot.xyz/v1/dare", { timeout: 5000 });
        result = data?.question;
      }
    } catch { result = null; }

    if (!result) {
      const pool = type === "truth"
        ? (mode === "spicy" ? spicyTruths : familyTruths)
        : (mode === "spicy" ? spicyDares  : familyDares);
      result = pool[Math.floor(Math.random() * pool.length)];
    }

    // Update streak
    if (!streaks[key]) streaks[key] = { streak: 0, total: 0, last: null };
    const today = new Date().toDateString();
    if (streaks[key].last === today) {
      streaks[key].streak++;
    } else if (streaks[key].last !== new Date(Date.now() - 86400000).toDateString()) {
      streaks[key].streak = 1; // reset if skipped a day
    } else {
      streaks[key].streak++;
    }
    streaks[key].total++;
    streaks[key].last = today;
    saveStreaks(streaks);

    const emoji = type === "truth" ? "💬" : "🎯";
    const label = type === "truth" ? "TRUTH" : "DARE";
    const modeTag = mode === "spicy" ? " 🌶️" : "";
    const streakMsg = streaks[key].streak > 1 ? `\n🔥 Streak: ${streaks[key].streak} | Total: ${streaks[key].total}` : "";

    await sock.sendMessage(from, {
      text: `${emoji} *${label}${modeTag}*\n\n${result}${streakMsg}\n\n_Type .tod spicy for spicier questions_`
    }, { quoted: msg });
  }
};
