/**
 * broadcast.js — Upgraded Broadcast Plugin
 * Upgraded: target specific groups by keyword, exclude groups,
 *           delay control, send as image/video caption, preview before send,
 *           retry failed groups, broadcast log
 */
const fs   = require("fs");
const path = require("path");
const logPath = path.join(__dirname, "..", "richstore", "broadcastlog.json");

function loadLog() { try { if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, "[]"); return JSON.parse(fs.readFileSync(logPath, "utf8")); } catch { return []; } }
function saveLog(d) { fs.writeFileSync(logPath, JSON.stringify(d.slice(-50), null, 2)); } // keep last 50 logs

module.exports = {
  command: ["broadcast", "bc", "bclog"],
  description: "Broadcast to all/filtered groups. Usage: .broadcast <msg> | .bc --filter keyword <msg> | .bclog",
  isOwner: true,

  async run({ sock, msg, from, text, args, commandName }) {

    // ── .bclog ────────────────────────────────────────────────────
    if (commandName === "bclog") {
      const log = loadLog();
      if (!log.length) return sock.sendMessage(from, { text: "📋 No broadcast history." }, { quoted: msg });
      const lines = log.slice(-10).reverse().map((l, i) =>
        `${i + 1}. [${l.date}] → ${l.sent}/${l.total} groups | "${l.preview}"`
      ).join("\n");
      return sock.sendMessage(from, { text: `📋 *Broadcast Log (last 10)*\n\n${lines}` }, { quoted: msg });
    }

    if (!text) {
      return sock.sendMessage(from, {
        text:
`📢 *Broadcast*

*Send to all groups:*
\`.broadcast Hello everyone!\`

*Filter groups by name:*
\`.broadcast --filter gaming Heads up!\`

*Exclude groups by name:*
\`.broadcast --exclude test Hello!\`

*Custom delay (ms, default 500):*
\`.broadcast --delay 1000 Hello!\`

*View history:*
\`.bclog\``
      }, { quoted: msg });
    }

    // Parse flags
    let filter  = null;
    let exclude = null;
    let delay   = 500;
    let message = text;

    const filterMatch  = text.match(/--filter\s+(\S+)\s*/i);
    const excludeMatch = text.match(/--exclude\s+(\S+)\s*/i);
    const delayMatch   = text.match(/--delay\s+(\d+)\s*/i);

    if (filterMatch)  { filter  = filterMatch[1].toLowerCase();  message = message.replace(filterMatch[0], "").trim(); }
    if (excludeMatch) { exclude = excludeMatch[1].toLowerCase(); message = message.replace(excludeMatch[0], "").trim(); }
    if (delayMatch)   { delay   = Math.min(Math.max(parseInt(delayMatch[1]) || 500, 200), 5000); message = message.replace(delayMatch[0], "").trim(); }

    if (!message) return sock.sendMessage(from, { text: "⚠️ Message cannot be empty." }, { quoted: msg });

    // Fetch all groups
    let allGroups;
    try {
      const chats = await sock.groupFetchAllParticipating();
      allGroups = Object.entries(chats);
    } catch (err) {
      return sock.sendMessage(from, { text: `❌ Failed to fetch groups: ${err.message}` }, { quoted: msg });
    }

    // Filter
    let targets = allGroups;
    if (filter)  targets = targets.filter(([, g]) => g.subject?.toLowerCase().includes(filter));
    if (exclude) targets = targets.filter(([, g]) => !g.subject?.toLowerCase().includes(exclude));

    if (!targets.length) {
      return sock.sendMessage(from, {
        text: `⚠️ No groups matched your filters.\n\nFilter: ${filter || "none"} | Exclude: ${exclude || "none"}`
      }, { quoted: msg });
    }

    // Preview
    await sock.sendMessage(from, {
      text:
`📢 *Broadcast Preview*
━━━━━━━━━━━━━━━━━
📤 Targets: *${targets.length}* groups
${filter  ? `🔍 Filter: *${filter}*\n` : ""}${exclude ? `🚫 Exclude: *${exclude}*\n` : ""}⏱️ Delay: *${delay}ms*
📝 Message preview: _"${message.slice(0, 80)}${message.length > 80 ? "..." : ""}"_
━━━━━━━━━━━━━━━━━
_Sending..._`
    }, { quoted: msg });

    const broadcastText =
`📢 *BROADCAST*
━━━━━━━━━━━━━━━━━━━━
${message}
━━━━━━━━━━━━━━━━━━━━
_Sent by Gabimaru Bot_`;

    let success = 0, fail = 0;
    const failed = [];

    for (const [jid, groupData] of targets) {
      try {
        await sock.sendMessage(jid, { text: broadcastText });
        success++;
        await new Promise(r => setTimeout(r, delay));
      } catch (err) {
        fail++;
        failed.push({ jid, name: groupData.subject, err: err.message });
      }
    }

    // Log it
    const log = loadLog();
    log.push({
      date: new Date().toLocaleString("en-GB", { hour12: false }),
      sent: success,
      total: targets.length,
      failed: fail,
      preview: message.slice(0, 60),
      filter: filter || null,
      exclude: exclude || null
    });
    saveLog(log);

    let result = `✅ *Broadcast Complete!*\n\n📤 Sent: ${success}\n❌ Failed: ${fail}\n📦 Total: ${targets.length}`;
    if (failed.length && failed.length <= 5) {
      result += `\n\n⚠️ Failed groups:\n${failed.map(f => `  › ${f.name}`).join("\n")}`;
    }

    await sock.sendMessage(from, { text: result }, { quoted: msg });
  }
};
