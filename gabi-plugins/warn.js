const fs = require("fs");
const path = require("path");

const warnPath = path.join(__dirname, "..", "richstore", "warnings.json");

function loadWarns() {
  try {
    if (!fs.existsSync(warnPath)) fs.writeFileSync(warnPath, "{}");
    return JSON.parse(fs.readFileSync(warnPath, "utf8"));
  } catch { return {}; }
}

function saveWarns(data) {
  fs.writeFileSync(warnPath, JSON.stringify(data, null, 2));
}

module.exports = {
  command: ["warn", "warnings", "clearwarn", "resetwarn"],
  description: "Warning system for group management",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, commandName, text }) {
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = quotedInfo?.mentionedJid?.[0];
    const repliedToJid = quotedInfo?.participant;
    const target = mentionedJid || repliedToJid;

    const warns = loadWarns();
    const groupKey = `${from}`;
    if (!warns[groupKey]) warns[groupKey] = {};

    // .warnings — check warns of a user
    if (commandName === "warnings") {
      if (!target) {
        // List all warned users
        const entries = Object.entries(warns[groupKey]);
        if (!entries.length) {
          return sock.sendMessage(from, { text: "✅ No warnings in this group." }, { quoted: msg });
        }
        const list = entries.map(([jid, data]) =>
          `📛 @${jid.split("@")[0]} — ⚠️ ${data.count} warn(s)`
        ).join("\n");
        return sock.sendMessage(from, {
          text: `╭──❍ *Group Warnings*\n${list}\n╰─────────────`,
          mentions: entries.map(([jid]) => jid)
        }, { quoted: msg });
      }

      const userWarns = warns[groupKey][target];
      if (!userWarns || userWarns.count === 0) {
        return sock.sendMessage(from, {
          text: `✅ @${target.split("@")[0]} has no warnings.`,
          mentions: [target]
        }, { quoted: msg });
      }

      const reasons = userWarns.reasons?.map((r, i) => `  ${i + 1}. ${r}`).join("\n") || "  None";
      return sock.sendMessage(from, {
        text: `⚠️ *Warnings for @${target.split("@")[0]}*\n\n🔢 Count: ${userWarns.count}/3\n📝 Reasons:\n${reasons}`,
        mentions: [target]
      }, { quoted: msg });
    }

    // .clearwarn / .resetwarn
    if (commandName === "clearwarn" || commandName === "resetwarn") {
      if (!target) {
        return sock.sendMessage(from, { text: "❌ Mention or reply to a user." }, { quoted: msg });
      }
      delete warns[groupKey][target];
      saveWarns(warns);
      return sock.sendMessage(from, {
        text: `✅ Cleared all warnings for @${target.split("@")[0]}`,
        mentions: [target]
      }, { quoted: msg });
    }

    // .warn
    if (!target) {
      return sock.sendMessage(from, { text: "❌ Mention or reply to a user to warn them." }, { quoted: msg });
    }

    if (target === sock.user?.id) {
      return sock.sendMessage(from, { text: "😅 I can't warn myself." }, { quoted: msg });
    }

    if (!warns[groupKey][target]) {
      warns[groupKey][target] = { count: 0, reasons: [] };
    }

    warns[groupKey][target].count += 1;
    const reason = text || "No reason given";
    warns[groupKey][target].reasons.push(reason);

    const count = warns[groupKey][target].count;
    saveWarns(warns);

    if (count >= 3) {
      // Auto-kick at 3 warns
      try {
        await sock.groupParticipantsUpdate(from, [target], "remove");
        delete warns[groupKey][target];
        saveWarns(warns);
        return sock.sendMessage(from, {
          text: `🚨 @${target.split("@")[0]} has been *auto-kicked* after reaching 3 warnings!`,
          mentions: [target]
        }, { quoted: msg });
      } catch {
        return sock.sendMessage(from, {
          text: `⚠️ @${target.split("@")[0]} has *3 warnings* but could not be kicked. Please remove manually.`,
          mentions: [target]
        }, { quoted: msg });
      }
    }

    await sock.sendMessage(from, {
      text: `⚠️ *Warning Issued*\n\n👤 User: @${target.split("@")[0]}\n🔢 Count: ${count}/3\n📝 Reason: ${reason}\n\n_${3 - count} more warn(s) until auto-kick._`,
      mentions: [target]
    }, { quoted: msg });
  }
};
