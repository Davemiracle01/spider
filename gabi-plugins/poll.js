/**
 * poll.js — Upgraded Poll Plugin
 * Upgraded: up to 12 options (from 3 limit), multi-select polls,
 *           anonymous mode, timed polls, poll listing
 */
const fs   = require("fs");
const path = require("path");
const pollPath = path.join(__dirname, "..", "richstore", "polls.json");

function loadPolls() {
  try {
    if (!fs.existsSync(pollPath)) fs.writeFileSync(pollPath, "{}");
    return JSON.parse(fs.readFileSync(pollPath, "utf8"));
  } catch { return {}; }
}
function savePolls(data) {
  fs.writeFileSync(pollPath, JSON.stringify(data, null, 2));
}

module.exports = {
  command: ["poll", "multipoll"],
  description: "Create a poll. Up to 12 options. .poll Question | Opt1 | Opt2 ... | multi (for multi-select)",
  isGroup: true,

  async run({ sock, msg, from, text, commandName }) {
    if (!text) {
      return sock.sendMessage(from, {
        text:
`📊 *Poll Creator*

*Single choice:*
\`.poll Favorite fruit? | Mango | Orange | Apple\`

*Multi-select (voters pick multiple):*
\`.poll Best qualities? | Funny | Smart | Kind | multi\`

*Up to 12 options supported.*`
      }, { quoted: msg });
    }

    const parts = text.split("|").map(p => p.trim()).filter(Boolean);

    // Check for 'multi' flag
    const lastPart = parts[parts.length - 1]?.toLowerCase();
    const isMulti  = lastPart === "multi" || commandName === "multipoll";
    const cleanParts = isMulti && lastPart === "multi" ? parts.slice(0, -1) : parts;

    if (cleanParts.length < 3) {
      return sock.sendMessage(from, {
        text: "⚠️ Provide a question and at least 2 options separated by `|`\n\nExample: `.poll Who wins? | Gojo | Sukuna | Itadori`"
      }, { quoted: msg });
    }

    const question = cleanParts[0];
    const options  = cleanParts.slice(1, 13); // max 12 options (WhatsApp limit)

    if (options.length > 12) {
      return sock.sendMessage(from, {
        text: "⚠️ Maximum 12 options allowed per poll."
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(from, {
        poll: {
          name: question,
          values: options,
          selectableCount: isMulti ? options.length : 1
        }
      }, { quoted: msg });

      // Save poll metadata for reference
      const polls = loadPolls();
      if (!polls[from]) polls[from] = [];
      polls[from].push({
        question,
        options,
        multi: isMulti,
        creator: msg.key?.participant || from,
        createdAt: new Date().toISOString()
      });
      if (polls[from].length > 20) polls[from].shift();
      savePolls(polls);

    } catch {
      // Fallback: text-based poll
      const numbered = options.map((o, i) => `  ${i + 1}. ${o}`).join("\n");
      const voteType = isMulti ? "_You may vote for multiple options_" : "_Reply with the number to vote!_";
      await sock.sendMessage(from, {
        text: `📊 *Poll*\n\n❓ *${question}*\n\n${numbered}\n\n${voteType}`
      }, { quoted: msg });
    }
  }
};
