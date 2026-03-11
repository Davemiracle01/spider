/**
 * antispam.js — Upgraded Anti-Spam Plugin
 * Upgraded: configurable limit/window per group, progressive punishment
 *           (warn → mute → kick), whitelist trusted members, stats
 */
const fs   = require("fs");
const path = require("path");

const dbPath   = path.join(__dirname, "..", "richstore", "antispam.json");
const cfgPath  = path.join(__dirname, "..", "richstore", "antispamcfg.json");
const wlPath   = path.join(__dirname, "..", "richstore", "antispam_wl.json");

function load(p, def = "{}") { try { if (!fs.existsSync(p)) fs.writeFileSync(p, def); return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return {}; } }
function save(p, d) { fs.writeFileSync(p, JSON.stringify(d, null, 2)); }

// In-memory tracker: "group:sender" → { count, ts, strikes }
const tracker = {};
const DEFAULT_LIMIT  = 8;  // messages
const DEFAULT_WINDOW = 8;  // seconds

module.exports = {
  command: ["antispam", "spamstats", "spamwhitelist"],
  description: "Configurable anti-spam with progressive punishment (warn → mute → kick).",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, args, commandName }) {
    const db  = load(dbPath);
    const cfg = load(cfgPath);
    const wl  = load(wlPath);

    // ── .spamstats ──────────────────────────────────────────────
    if (commandName === "spamstats") {
      const entries = Object.entries(tracker)
        .filter(([k]) => k.startsWith(from + ":"))
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      if (!entries.length) return sock.sendMessage(from, { text: "📊 No spam activity recorded yet." }, { quoted: msg });

      const list = entries.map(([k, v]) => {
        const user = k.split(":")[1]?.split("@")[0];
        return `  @${user} — ${v.count} msgs, ${v.strikes || 0} strikes`;
      }).join("\n");

      return sock.sendMessage(from, {
        text: `📊 *Spam Stats (Top 10)*\n\n${list}`,
        mentions: entries.map(([k]) => k.split(":")[1])
      }, { quoted: msg });
    }

    // ── .spamwhitelist ──────────────────────────────────────────
    if (commandName === "spamwhitelist") {
      const ctx    = msg.message?.extendedTextMessage?.contextInfo;
      const target = ctx?.mentionedJid?.[0] || ctx?.participant;
      if (!wl[from]) wl[from] = [];

      if (!target) {
        if (!wl[from].length) return sock.sendMessage(from, { text: "✅ No whitelisted users." }, { quoted: msg });
        const list = wl[from].map(j => `  › @${j.split("@")[0]}`).join("\n");
        return sock.sendMessage(from, { text: `🔒 *Spam Whitelist*\n\n${list}`, mentions: wl[from] }, { quoted: msg });
      }

      if (wl[from].includes(target)) {
        wl[from] = wl[from].filter(j => j !== target);
        save(wlPath, wl);
        return sock.sendMessage(from, { text: `✅ @${target.split("@")[0]} removed from whitelist.`, mentions: [target] }, { quoted: msg });
      }
      wl[from].push(target);
      save(wlPath, wl);
      return sock.sendMessage(from, { text: `✅ @${target.split("@")[0]} added to spam whitelist.`, mentions: [target] }, { quoted: msg });
    }

    // ── .antispam ───────────────────────────────────────────────
    const toggle  = args[0]?.toLowerCase();
    const groupCfg = cfg[from] || { limit: DEFAULT_LIMIT, window: DEFAULT_WINDOW, action: "progressive" };

    // .antispam set limit 10
    if (toggle === "set" && args[1] === "limit" && args[2]) {
      const n = parseInt(args[2]);
      if (isNaN(n) || n < 2 || n > 50) return sock.sendMessage(from, { text: "❌ Limit must be 2–50." }, { quoted: msg });
      cfg[from] = { ...groupCfg, limit: n };
      save(cfgPath, cfg);
      return sock.sendMessage(from, { text: `✅ Spam limit set to *${n} messages*.` }, { quoted: msg });
    }

    // .antispam set window 5
    if (toggle === "set" && args[1] === "window" && args[2]) {
      const n = parseInt(args[2]);
      if (isNaN(n) || n < 2 || n > 60) return sock.sendMessage(from, { text: "❌ Window must be 2–60 seconds." }, { quoted: msg });
      cfg[from] = { ...groupCfg, window: n };
      save(cfgPath, cfg);
      return sock.sendMessage(from, { text: `✅ Spam window set to *${n} seconds*.` }, { quoted: msg });
    }

    // .antispam action kick|warn|progressive
    if (toggle === "action" && args[1]) {
      const act = args[1].toLowerCase();
      if (!["warn", "kick", "progressive"].includes(act)) return sock.sendMessage(from, { text: "❌ Action: warn | kick | progressive" }, { quoted: msg });
      cfg[from] = { ...groupCfg, action: act };
      save(cfgPath, cfg);
      return sock.sendMessage(from, { text: `✅ Spam action set to *${act}*.` }, { quoted: msg });
    }

    if (!toggle || !["on", "off"].includes(toggle)) {
      const state = db[from] ? "ON 🟢" : "OFF 🔴";
      return sock.sendMessage(from, {
        text:
`🛡️ *Anti-Spam Settings*

Status: *${state}*
Limit: *${groupCfg.limit} messages / ${groupCfg.window}s*
Action: *${groupCfg.action}*

Toggle:
› *.antispam on/off*

Configure:
› *.antispam set limit 10*
› *.antispam set window 5*
› *.antispam action progressive* (warn→kick)
› *.antispam action warn*
› *.antispam action kick*
› *.spamwhitelist @user* — whitelist a user
› *.spamstats* — view activity`
      }, { quoted: msg });
    }

    if (toggle === "on") { db[from] = true; } else { delete db[from]; }
    save(dbPath, db);
    const l = groupCfg.limit, w = groupCfg.window;
    await sock.sendMessage(from, {
      text: `🛡️ Anti-Spam is now *${toggle.toUpperCase()}* ${toggle === "on" ? `🟢\n\nLimit: ${l} msgs/${w}s → ${groupCfg.action}` : "🔴"}`
    }, { quoted: msg });
  },

  // Called from gabi.js on every group message
  checkSpam(groupJid, senderJid) {
    const db  = load(dbPath);
    const cfg = load(cfgPath);
    const wl  = load(wlPath);

    if (!db[groupJid]) return false;
    if ((wl[groupJid] || []).includes(senderJid)) return false;

    const groupCfg = cfg[groupJid] || { limit: DEFAULT_LIMIT, window: DEFAULT_WINDOW, action: "progressive" };
    const key  = `${groupJid}:${senderJid}`;
    const now  = Date.now();

    if (!tracker[key] || (now - tracker[key].ts) > groupCfg.window * 1000) {
      tracker[key] = { count: 1, ts: now, strikes: tracker[key]?.strikes || 0 };
      return false;
    }

    tracker[key].count++;

    if (tracker[key].count >= groupCfg.limit) {
      tracker[key].strikes = (tracker[key].strikes || 0) + 1;
      tracker[key].count   = 0;
      tracker[key].ts      = now;
      return { action: groupCfg.action, strikes: tracker[key].strikes };
    }

    return false;
  },

  loadDB: () => load(dbPath),
};
