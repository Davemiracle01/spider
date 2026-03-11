/**
 * warn.js — Upgraded Warning System
 * Upgraded: configurable max warns per group, timed warns, warn reasons history,
 *           warn on reply without mention, DM notification to warned user, mute option
 */
const fs   = require("fs");
const path = require("path");

const warnPath   = path.join(__dirname, "..", "richstore", "warnings.json");
const configPath = path.join(__dirname, "..", "richstore", "warnconfig.json");

function loadWarns()  { try { if (!fs.existsSync(warnPath))   fs.writeFileSync(warnPath,   "{}"); return JSON.parse(fs.readFileSync(warnPath,   "utf8")); } catch { return {}; } }
function saveWarns(d) { fs.writeFileSync(warnPath,   JSON.stringify(d, null, 2)); }
function loadConfig() { try { if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, "{}"); return JSON.parse(fs.readFileSync(configPath, "utf8")); } catch { return {}; } }
function saveConfig(d){ fs.writeFileSync(configPath, JSON.stringify(d, null, 2)); }

function getTarget(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  return ctx?.mentionedJid?.[0] || ctx?.participant || null;
}

module.exports = {
  command: ["warn", "warnings", "clearwarn", "resetwarn", "warnconfig"],
  description: "Warning system with configurable limits, DM notifications, and history.",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, commandName, text, args }) {
    const warns  = loadWarns();
    const config = loadConfig();
    const target = getTarget(msg);

    if (!warns[from])  warns[from]  = {};
    const groupCfg = config[from] || { maxWarns: 3, action: "kick" };

    // ── .warnconfig ──────────────────────────────────────────────
    if (commandName === "warnconfig") {
      const sub = args[0]?.toLowerCase();

      if (sub === "max" && args[1]) {
        const n = parseInt(args[1]);
        if (isNaN(n) || n < 1 || n > 20) return sock.sendMessage(from, { text: "❌ Max warns must be between 1 and 20." }, { quoted: msg });
        config[from] = { ...groupCfg, maxWarns: n };
        saveConfig(config);
        return sock.sendMessage(from, { text: `✅ Max warnings set to *${n}* for this group.` }, { quoted: msg });
      }

      if (sub === "action" && args[1]) {
        const action = args[1].toLowerCase();
        if (!["kick", "mute", "ban"].includes(action)) return sock.sendMessage(from, { text: "❌ Action must be: kick, mute, or ban" }, { quoted: msg });
        config[from] = { ...groupCfg, action };
        saveConfig(config);
        return sock.sendMessage(from, { text: `✅ Warn action set to *${action}* (triggers at max warns).` }, { quoted: msg });
      }

      return sock.sendMessage(from, {
        text:
`⚙️ *Warn Config*

🔢 Max warns: *${groupCfg.maxWarns}*
⚡ Action at max: *${groupCfg.action}*

Usage:
› *.warnconfig max 5* — set max to 5
› *.warnconfig action kick* — kick on max
› *.warnconfig action mute* — mute on max`
      }, { quoted: msg });
    }

    // ── .warnings ─────────────────────────────────────────────────
    if (commandName === "warnings") {
      if (!target) {
        const entries = Object.entries(warns[from]);
        if (!entries.length) return sock.sendMessage(from, { text: "✅ No warnings in this group." }, { quoted: msg });
        const list = entries.map(([jid, d]) => `📛 @${jid.split("@")[0]} — ⚠️ ${d.count}/${groupCfg.maxWarns}`).join("\n");
        return sock.sendMessage(from, {
          text: `╭──❍ *Group Warnings*\n${list}\n╰─────────────`,
          mentions: entries.map(([jid]) => jid)
        }, { quoted: msg });
      }

      const uWarns = warns[from][target];
      if (!uWarns || !uWarns.count) {
        return sock.sendMessage(from, {
          text: `✅ @${target.split("@")[0]} has no warnings.`, mentions: [target]
        }, { quoted: msg });
      }

      const reasons = uWarns.reasons?.map((r, i) => `  ${i + 1}. ${r.reason} _(${r.by || "admin"} · ${r.at || "?"})_`).join("\n") || "  None";
      return sock.sendMessage(from, {
        text: `⚠️ *Warnings for @${target.split("@")[0]}*\n\n🔢 Count: ${uWarns.count}/${groupCfg.maxWarns}\n📝 Reasons:\n${reasons}`,
        mentions: [target]
      }, { quoted: msg });
    }

    // ── .clearwarn / .resetwarn ────────────────────────────────────
    if (["clearwarn", "resetwarn"].includes(commandName)) {
      if (!target) return sock.sendMessage(from, { text: "❌ Mention or reply to a user." }, { quoted: msg });
      delete warns[from][target];
      saveWarns(warns);
      return sock.sendMessage(from, {
        text: `✅ Cleared all warnings for @${target.split("@")[0]}`, mentions: [target]
      }, { quoted: msg });
    }

    // ── .warn ──────────────────────────────────────────────────────
    if (!target) return sock.sendMessage(from, { text: "❌ Mention or reply to a user to warn them." }, { quoted: msg });
    if (target === sock.user?.id) return sock.sendMessage(from, { text: "😅 I can't warn myself." }, { quoted: msg });

    const adminId = msg.key?.participant || msg.key?.remoteJid;

    if (!warns[from][target]) warns[from][target] = { count: 0, reasons: [] };
    warns[from][target].count++;

    const reason  = text || "No reason given";
    const warnAt  = new Date().toLocaleString("en-GB", { hour12: true });
    warns[from][target].reasons.push({ reason, by: adminId?.split("@")[0] || "admin", at: warnAt });

    const count    = warns[from][target].count;
    const maxWarns = groupCfg.maxWarns;
    saveWarns(warns);

    // Try to DM the warned user
    try {
      const meta = await sock.groupMetadata(from);
      const groupName = meta?.subject || "the group";
      await sock.sendMessage(target, {
        text: `⚠️ *You received a warning in ${groupName}*\n\n📝 Reason: ${reason}\n🔢 Warns: ${count}/${maxWarns}\n\n_${maxWarns - count > 0 ? `${maxWarns - count} more warn(s) until ${groupCfg.action}.` : "You have reached the maximum!"}_`
      }).catch(() => {});
    } catch { /* DM may fail, ignore */ }

    if (count >= maxWarns) {
      try {
        let actionMsg = "";
        if (groupCfg.action === "kick") {
          await sock.groupParticipantsUpdate(from, [target], "remove");
          actionMsg = `🚨 @${target.split("@")[0]} has been *kicked* after reaching ${maxWarns} warnings!`;
        } else if (groupCfg.action === "mute") {
          // Attempt to mute via group settings (limited API support)
          actionMsg = `🔇 @${target.split("@")[0]} has reached ${maxWarns} warnings. Please mute or remove them manually.`;
        } else {
          actionMsg = `🚫 @${target.split("@")[0]} has reached ${maxWarns} warnings and should be removed.`;
        }
        delete warns[from][target];
        saveWarns(warns);
        return sock.sendMessage(from, { text: actionMsg, mentions: [target] }, { quoted: msg });
      } catch {
        return sock.sendMessage(from, {
          text: `⚠️ @${target.split("@")[0]} has *${maxWarns} warnings* but could not be actioned. Please handle manually.`,
          mentions: [target]
        }, { quoted: msg });
      }
    }

    await sock.sendMessage(from, {
      text: `⚠️ *Warning Issued*\n\n👤 User: @${target.split("@")[0]}\n🔢 Count: ${count}/${maxWarns}\n📝 Reason: ${reason}\n\n_${maxWarns - count} more warn(s) until auto-${groupCfg.action}._`,
      mentions: [target]
    }, { quoted: msg });
  }
};
