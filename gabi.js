/**
 * gabi.js — Gabimaru WhatsApp Bot Core Handler
 * v7.0 — Heroku-Optimized | Public Mode | Multi-Session
 * Owners: 254769279076, 254799073744
 *
 * Upgrades over v6:
 *  - Per-chat AI conversation memory (sliding window, persisted to disk)
 *  - Per-user AI rate limiting (prevents API abuse / cost runaway)
 *  - Plugin hot-reload via .reload command (no dyno restart needed)
 *  - Anti-spam now actually acts (kick/warn/progressive) instead of just logging
 *  - Anti-link logs offences to admin panel before kicking
 *  - Admin panel event push on every command error
 *  - Groq API retry with exponential backoff on 503/429
 *  - Block-list enforced at message entry point
 *  - Session number shown in console log per message
 *  - .clearchat command resets AI memory for a chat
 */

const {
  getContentType,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const chalk     = require("chalk");
const moment    = require("moment-timezone");
const fs        = require("fs");
const https     = require("https");
const http      = require("http");
const path      = require("path");
const NodeCache = require("node-cache");
const Groq      = require("groq-sdk");

const settings              = require("./settings.json");
const { isChatbotDisabled } = require("./chatbot");
const { checkMonthYear }    = require("./monthCheck");

// ─── Shared API Cache (5-min TTL) ─────────────────────────────────────────────
const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });

// ─── Shared Axios Instance ─────────────────────────────────────────────────────
const axios = require("axios").create({
  timeout: 12000,
  headers: { "User-Agent": "GabimaruBot/7.0" },
  httpsAgent: new https.Agent({ keepAlive: true }),
  httpAgent:  new http.Agent({ keepAlive: true }),
});

// ─── Anti-link DB ──────────────────────────────────────────────────────────────
const antiLinkPath = path.join(__dirname, "richstore", "antilink.json");
let antiLinkDB = {};
try {
  if (fs.existsSync(antiLinkPath))
    antiLinkDB = JSON.parse(fs.readFileSync(antiLinkPath, "utf8"));
} catch {}

// ─── Block-list (enforced at message entry point) ─────────────────────────────
const blockListPath = path.join(__dirname, "richstore", "blocklist.json");
function isBlocked(number) {
  try {
    const data = JSON.parse(fs.readFileSync(blockListPath, "utf8"));
    return (data.blocked || []).includes(number.replace(/[^0-9]/g, ""));
  } catch { return false; }
}

// ─── Sticker Folders ──────────────────────────────────────────────────────────
const inputFolder  = path.join(__dirname, "stick_input");
const outputFolder = path.join(__dirname, "stick_output");
if (!fs.existsSync(inputFolder))  fs.mkdirSync(inputFolder,  { recursive: true });
if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });

// ─── Plugin Loader (supports hot-reload) ──────────────────────────────────────
const commands = new Map();

function loadPlugins() {
  const pluginsDir = path.join(__dirname, "gabi-plugins");
  if (!fs.existsSync(pluginsDir)) return;
  const files = fs.readdirSync(pluginsDir).filter((f) => f.endsWith(".js"));
  commands.clear();
  for (const file of files) {
    try {
      const fullPath = path.join(pluginsDir, file);
      delete require.cache[require.resolve(fullPath)]; // bust cache for hot-reload
      const plugin = require(fullPath);
      if (!plugin.command) continue;
      const aliases = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
      aliases.forEach((alias) => commands.set(alias.toLowerCase(), plugin));
    } catch (e) {
      console.error(chalk.red(`[PLUGIN ERROR] ${file}:`), e.message);
    }
  }
  console.log(chalk.green(`✅ ${commands.size} commands loaded from ${files.length} plugins.`));
}
loadPlugins();

// ─── Groq AI Client ────────────────────────────────────────────────────────────
const groqApiKey = process.env.GROQ_API_KEY;
let groq;
if (groqApiKey) groq = new Groq({ apiKey: groqApiKey });
else console.warn(chalk.yellow("[WARN] GROQ_API_KEY not set. AI chatbot disabled."));

// ─── AI Conversation Memory ────────────────────────────────────────────────────
// Persisted to disk so memory survives Heroku dyno restarts
const aiMemoryPath = path.join(__dirname, "richstore", "ai_memory.json");
let aiMemory = {};
try {
  if (fs.existsSync(aiMemoryPath))
    aiMemory = JSON.parse(fs.readFileSync(aiMemoryPath, "utf8"));
} catch {}

function saveAiMemory() {
  fs.writeFile(aiMemoryPath, JSON.stringify(aiMemory, null, 2), () => {});
}
function getHistory(chatId)           { return aiMemory[chatId] || []; }
function clearHistory(chatId)         { delete aiMemory[chatId]; saveAiMemory(); }
function pushHistory(chatId, role, content) {
  if (!aiMemory[chatId]) aiMemory[chatId] = [];
  aiMemory[chatId].push({ role, content });
  // Keep last 20 messages (10 exchanges) per chat
  if (aiMemory[chatId].length > 20) aiMemory[chatId] = aiMemory[chatId].slice(-20);
  saveAiMemory();
}

// ─── AI Rate Limiter (per sender, prevents cost runaway) ──────────────────────
const AI_RATE_LIMIT  = 8;   // max requests
const AI_RATE_WINDOW = 60;  // per N seconds
const aiRateTracker  = {};

function isAiRateLimited(senderId) {
  const now  = Date.now();
  const data = aiRateTracker[senderId];
  if (!data || (now - data.ts) > AI_RATE_WINDOW * 1000) {
    aiRateTracker[senderId] = { count: 1, ts: now };
    return false;
  }
  aiRateTracker[senderId].count++;
  return aiRateTracker[senderId].count > AI_RATE_LIMIT;
}

// ─── Groq retry wrapper (handles 503 / 429 gracefully) ────────────────────────
async function groqWithRetry(messages, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        messages,
        model: "llama3-8b-8192",
        max_tokens: 200,
        temperature: 0.8,
      });
      return completion.choices[0]?.message?.content || null;
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if ((status === 503 || status === 429) && attempt < retries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
        continue;
      }
      throw err;
    }
  }
}

// ─── Owner/Dev helpers ─────────────────────────────────────────────────────────
const OWNER_NUMBERS = ["254769279076", "254799073744"];

function isOwnerNumber(num) {
  const clean = num.replace(/[^0-9]/g, "");
  return OWNER_NUMBERS.includes(clean) || clean === settings.owner;
}

function isSudoJid(jid, sock) {
  const num = jid.split("@")[0];
  if (isOwnerNumber(num)) return true;
  if (sock && jidNormalizedUser(sock.user?.id) === jidNormalizedUser(jid)) return true;
  const sudoList = settings.sudo || [];
  return sudoList.some(s => jidNormalizedUser(s) === jidNormalizedUser(jid));
}

// ─── Spider-Venom Symbiote Menu ────────────────────────────────────────────────
const MENU_CATEGORIES = {
  "🕷️ SYMBIOTE CORE": {
    desc: "Bot control & settings",
    cmds: ["alive","ping","menu","help","self","public","addsudo","delsudo","listsudo","chatbot","rvo","chatid","block","ghost","bugreport","reload","clearchat"],
  },
  "🛡️ GROUP CONTROL": {
    desc: "Group management & protection",
    cmds: ["kick","kickall","promote","demote","warn","warnings","clearwarn","mute","unmute","tagall","hidetag","groupinfo","gclink","welcome","bye","setdesc","setname","antilink","lock","unlock","bancmd","unbancmd","antidelete","antispam"],
  },
  "👁️ STATUS & STEALTH": {
    desc: "Status viewing & privacy tools",
    cmds: ["viewstatus","vs","antimentionstatus","ams","ghost"],
  },
  "🎮 FUN & GAMES": {
    desc: "Entertainment & interactions",
    cmds: ["quote","joke","fact","8ball","flip","roast","ship","tod","truth","dare","wasted"],
  },
  "🌐 UTILITIES": {
    desc: "Tools & information lookup",
    cmds: ["weather","translate","tr","calc","lyrics","animechar","bible","waifu","sticker","telestick","pinterest","play","poll","ai","ask"],
  },
  "💀 OWNER ONLY": {
    desc: "Restricted — owner/dev only",
    cmds: ["ddos","ddos2","hijack","keepalive","nuke","broadcast","setbotname","reload"],
  },
};

function buildMenu(pushName = "User") {
  const up = process.uptime();
  const h = String(Math.floor(up / 3600)).padStart(2, "0");
  const m = String(Math.floor((up % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(up % 60)).padStart(2, "0");

  const timeStr = moment()
    .tz(process.env.TZ || "Africa/Nairobi")
    .format("HH:mm:ss | ddd, MMM D");

  const readmore = "\u200e".repeat(4001);

  let menu = `
╭━━━〔 spider 🕸️ web〕━━━⬣
┃ 👤 User : *${pushName}*
┃ 🤖 Bot  : *${settings.botName || "spider🕷️"}*
┃ ⚡ Status : *ONLINE*
┃ ⏱ Uptime : *${h}:${m}:${s}*
┃ 🧠 Commands : *${commands.size}*
┃ 🌐 Prefix : *${settings.prefix}*
┃ 🕒 Time : *${timeStr}*
╰━━━━━━━━━━━━━━━━━━━━⬣

_"We are Venom. We protect the host."_
${readmore}
`;

  for (const [cat, { desc, cmds }] of Object.entries(MENU_CATEGORIES)) {
    const seen = new Set();
    const entries = [];

    for (const alias of cmds) {
      const plugin = commands.get(alias);
      if (!plugin) continue;

      const primary = Array.isArray(plugin.command)
        ? plugin.command[0]
        : plugin.command;

      if (seen.has(primary)) continue;
      seen.add(primary);

      entries.push(`│ ▸ *${settings.prefix}${primary}*`);
    }

    if (!entries.length) continue;

    menu += `
╭─❍ *${cat}*
│ ${desc}
│
${entries.join("\n")}
╰───────────────⬣
`;
  }

  menu += `
╭━━━〔 SYSTEM 〕━━━⬣
┃ 🔗 Owner : *${settings.owner}*
┃ 🧬 Version : *Spider‑Venom v7*
┃ 🕸 Engine : *Baileys Multi‑Device*
╰━━━━━━━━━━━━━━⬣
`;

  return menu;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fakeQuote(from) {
  return {
    key: { fromMe: false, participant: "0@s.whatsapp.net", remoteJid: from },
    message: { conversation: "🕷️ Spider-Venom Symbiote" },
  };
}

async function sendRandomSticker(sock, from) {
  try {
    const stickers = fs.readdirSync(outputFolder).filter((f) => f.endsWith(".webp"));
    if (!stickers.length) return;
    const pick = stickers[Math.floor(Math.random() * stickers.length)];
    await sock.sendMessage(from, { sticker: fs.readFileSync(path.join(outputFolder, pick)) });
  } catch {}
}

// ─── Message Cache (for anti-delete) ──────────────────────────────────────────
const messageCache = new NodeCache({ stdTTL: 600, checkperiod: 120, useClones: false });

function cacheMessage(msgId, body) {
  if (msgId && body) messageCache.set(msgId, { body });
}

// ─── Anti-Delete Event Handler ─────────────────────────────────────────────────
async function handleMessageDelete(sock, update) {
  try {
    const { loadDB } = require("./gabi-plugins/antidelete");
    const db   = loadDB();
    const keys = update?.keys || update?.deleted || [];

    for (const key of keys) {
      const groupJid = key.remoteJid;
      if (!groupJid || !db[groupJid]) continue;
      const cachedMsg = messageCache.get(key.id);
      if (!cachedMsg) continue;
      const deleter = key.participant || key.remoteJid;
      const num     = deleter.split("@")[0];
      await sock.sendMessage(groupJid, {
        text: `🗑️ *Anti-Delete Triggered*\n\n👤 @${num} deleted a message:\n\n_"${cachedMsg.body}"_`,
        mentions: [deleter]
      });
    }
  } catch {}
}

// ─── Anti-Spam Action Handler ──────────────────────────────────────────────────
async function handleSpamAction(sock, from, sender, senderNumber, spamResult) {
  const { action, strikes } = spamResult;

  if (action === "progressive") {
    if (strikes === 1) {
      await sock.sendMessage(from, {
        text: `⚠️ @${senderNumber} — slow down! *Strike 1/3*. Keep spamming and you'll be removed.`,
        mentions: [sender]
      });
    } else if (strikes === 2) {
      await sock.sendMessage(from, {
        text: `🔇 @${senderNumber} — *Strike 2/3*. Final warning before kick!`,
        mentions: [sender]
      });
    } else {
      try {
        await sock.groupParticipantsUpdate(from, [sender], "remove");
        await sock.sendMessage(from, {
          text: `🚫 @${senderNumber} was *kicked* for repeated spamming.`,
          mentions: [sender]
        });
        if (global.pushAdminEvent)
          global.pushAdminEvent(`Anti-spam kicked: ${senderNumber}`, "warn");
      } catch {
        await sock.sendMessage(from, {
          text: `⚠️ @${senderNumber} reached spam limit but kick failed — ensure bot is admin.`,
          mentions: [sender]
        });
      }
    }
  } else if (action === "kick") {
    try {
      await sock.groupParticipantsUpdate(from, [sender], "remove");
      await sock.sendMessage(from, {
        text: `🚫 @${senderNumber} was *kicked* for spamming.`,
        mentions: [sender]
      });
    } catch {
      await sock.sendMessage(from, {
        text: `⚠️ Spam from @${senderNumber}. Kick failed — ensure bot is admin.`,
        mentions: [sender]
      });
    }
  } else {
    await sock.sendMessage(from, {
      text: `⚠️ @${senderNumber} is sending too many messages! Please slow down.`,
      mentions: [sender]
    });
  }
}

// ─── Main Message Handler ──────────────────────────────────────────────────────
async function handleMessage(sock, m) {
  try {
    const msg = m.messages[0];
    if (!msg?.message) return;

    const from     = msg.key.remoteJid;
    const isGroup  = from.endsWith("@g.us");
    const isStatus = from === "status@broadcast";
    const sender   = isGroup
      ? (msg.key?.participant || msg.participant || from)
      : from;
    const senderNumber = sender?.split("@")[0] || "unknown";

    // ── Global block-list check ────────────────────────────────────────────────
    if (isBlocked(senderNumber)) return;

    const type = getContentType(msg.message);
    const body = (
      type === "conversation"        ? msg.message.conversation :
      type === "extendedTextMessage" ? msg.message.extendedTextMessage.text :
      ""
    ).trim();

    const botJid  = jidNormalizedUser(sock.user.id);
    const isOwner = isOwnerNumber(senderNumber);
    const isSudo  = isSudoJid(sender, sock);

    // Cache message for anti-delete
    if (isGroup && msg.key?.id && body) {
      cacheMessage(msg.key.id, body);
    }

    // ── Status: Auto-View & Anti-Mention-Status ───────────────────────────────
    if (isStatus) {
      try { await sock.readMessages([msg.key]); } catch {}

      try {
        const { loadDB: loadAMS } = require("./gabi-plugins/antimentionstatus");
        const amsDB       = loadAMS();
        const ctxMentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (amsDB["global"] && ctxMentions.includes(botJid)) {
          const senderJid = msg.key.participant || sender;
          await sock.sendMessage(senderJid, {
            text: `👁️ *The symbiote saw your status.*\n\n_We are watching from the shadows. 🕷️_`
          });
        }
      } catch {}
      return;
    }

    // ── Console logging (with session number) ─────────────────────────────────
    const time    = moment().tz(process.env.TZ || "Africa/Nairobi").format("HH:mm:ss");
    const tag     = isGroup ? "GROUP" : "PM";
    const cmdPv   = body.startsWith(settings.prefix)
      ? body.slice(settings.prefix.length).trim().split(/\s+/)[0].toLowerCase()
      : "—";
    const session = sock.user?.id?.split("@")[0] || "?";

    console.log(
      chalk.yellow(`[${time}]`) + " " +
      chalk.gray(`[${session}]`) + " " +
      chalk.cyan(`[${tag}]`) + " " +
      chalk.green(msg.pushName || "?") + chalk.gray(" › ") +
      chalk.white(body.slice(0, 60)) +
      chalk.gray(` | cmd:`) + chalk.magentaBright(cmdPv)
    );

    // ── Anti-link ──────────────────────────────────────────────────────────────
    if (isGroup && antiLinkDB[from] && !isSudo) {
      const linkRe = /(https?:\/\/)?(chat\.whatsapp\.com|t\.me|discord\.gg|discord\.com\/invite)\/[^\s]+/i;
      if (linkRe.test(body)) {
        try {
          await sock.sendMessage(from, {
            text: `🔗 *Anti-Link*: Link from @${senderNumber} detected and removed.`,
            mentions: [sender]
          }, { quoted: msg });
          await sock.groupParticipantsUpdate(from, [sender], "remove");
          if (global.pushAdminEvent)
            global.pushAdminEvent(`Anti-link: removed ${senderNumber} from ${from}`, "warn");
        } catch {
          await sock.sendMessage(from, { text: "⚠️ Anti-link triggered but kick failed — ensure bot is admin." }, { quoted: msg });
        }
        return;
      }
    }

    // ── Anti-Spam ──────────────────────────────────────────────────────────────
    if (isGroup && !isSudo) {
      try {
        const antispam   = require("./gabi-plugins/antispam");
        const spamResult = antispam.checkSpam(from, sender);
        if (spamResult) {
          await handleSpamAction(sock, from, sender, senderNumber, spamResult);
        }
      } catch {}
    }

    // ── Command Dispatch ───────────────────────────────────────────────────────
    if (body.startsWith(settings.prefix)) {
      if (isGroup && !isSudo) {
        try {
          const bancmd = require("./gabi-plugins/bancmd");
          if (bancmd.isBanned(from, sender)) return;
        } catch {}
      }

      const args        = body.slice(settings.prefix.length).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();
      const text        = args.join(" ");
      const readmore    = "\u200e".repeat(4001);

      // ── Built-in: menu ─────────────────────────────────────────
      if (["menu","help","cmd","commands","botmenu"].includes(commandName)) {
        const caption = buildMenu(msg.pushName || "User");
        const images = [
          "https://files.catbox.moe/wz99v6.jpeg",
          "https://files.catbox.moe/h56ygm.jpeg"
        ];
        const randomImage = images[Math.floor(Math.random() * images.length)];
        await sock.sendMessage(from, { image: { url: randomImage }, caption }, { quoted: msg });
        return;
      }

      // ── Built-in: reload (sudo/owner only) ─────────────────────
      if (commandName === "reload") {
        if (!isSudo) return sock.sendMessage(from, { text: "⛔ Owner only." }, { quoted: msg });
        loadPlugins();
        if (global.pushAdminEvent)
          global.pushAdminEvent(`Plugins reloaded: ${commands.size} commands`, "success");
        return sock.sendMessage(from, {
          text: `🔄 *Plugins reloaded!*\n✅ ${commands.size} commands now active.\n_No restart needed._`
        }, { quoted: msg });
      }

      // ── Built-in: clearchat (reset AI memory for this chat) ────
      if (commandName === "clearchat") {
        clearHistory(from);
        return sock.sendMessage(from, {
          text: `🧹 *AI memory cleared* for this chat.\n\n_The symbiote forgets... for now._`
        }, { quoted: msg });
      }

      const plugin = commands.get(commandName);
      if (!plugin) return;

      if (plugin.isGroup && !isGroup)
        return sock.sendMessage(from, { text: "⚠️ This command only works in a group." }, { quoted: msg });

      const groupMetadata = (isGroup && (plugin.isAdmin || plugin.isGroup))
        ? await sock.groupMetadata(from).catch(() => null)
        : null;
      const isAdmin = isGroup
        && groupMetadata?.participants?.find((p) => jidNormalizedUser(p.id) === jidNormalizedUser(sender))?.admin;

      try {
        await plugin.run({
          sock, msg, from, sender, senderNumber, commandName, args, text,
          isOwner, readmore, isSudo, isAdmin, settings, axios, apiCache, isGroup, groupMetadata
        });
      } catch (err) {
        console.error(chalk.red(`[CMD ERR] ${commandName}:`), err.message);
        if (global.pushAdminEvent)
          global.pushAdminEvent(`CMD error: .${commandName} — ${err.message}`, "error");
        await sock.sendMessage(from, {
          text: `⚠️ Error in *${settings.prefix}${commandName}*\n_${err.message}_`
        }, { quoted: msg }).catch(() => {});
      }
      return;
    }

    // ── AI Chatbot (with memory + rate limiting) ───────────────────────────────
    if (isChatbotDisabled(from)) return;
    if (msg.key.fromMe)          return;

    const botName   = (settings.packname || "Gabimaru").toLowerCase();
    const ctxInfo   = msg.message.extendedTextMessage?.contextInfo;
    const mentioned = ctxInfo?.mentionedJid?.includes(botJid);
    const replied   = ctxInfo?.participant === botJid;
    const nameCall  = body.toLowerCase().startsWith(botName) && body.length > botName.length;

    if (!(mentioned || replied || nameCall)) return;
    if (!groq || !body) return;

    // Rate-limit per sender
    if (isAiRateLimited(sender)) {
      return sock.sendMessage(from, {
        text: `🕷️ _Slow down. Even the symbiote needs a breather. Try again in a minute._`
      }, { quoted: msg }).catch(() => {});
    }

    const reply = (t) =>
      sock.sendMessage(from, {
        contextInfo: {
          mentionedJid: [from],
          externalAdReply: {
            showAdAttribution:     false,
            renderLargerThumbnail: false,
            title:                 "Spider-Venom Symbiote",
            body:                  "We Are Venom",
            previewType:           "VIDEO",
            thumbnailUrl:          "https://c.top4top.io/p_3493r01s90.jpg",
            sourceUrl:             "https://t.me/Gabimarutechchannel",
            mediaUrl:              "https://t.me/Gabimarutechchannel",
          },
        },
        text: t,
      }, { quoted: fakeQuote(from) });

    const persona = `You are Gabimaru from Hell's Paradise bonded with the Venom symbiote. Strict, efficient, precise. Reply under 30 words. Creator: Gabimaru. Speak to ${msg.pushName}. Challengers get razor-sharp insults. Sometimes say "We are Venom." NEVER BREAK CHARACTER!`;

    // Build messages array with persistent conversation history
    const history  = getHistory(from);
    const messages = [
      { role: "system", content: persona },
      ...history,
      { role: "user", content: body },
    ];

    try {
      const aiText = await groqWithRetry(messages) || "We have no attachments to life.";
      pushHistory(from, "user",      body);
      pushHistory(from, "assistant", aiText);
      await reply(aiText);
      await sendRandomSticker(sock, from);
    } catch (aiErr) {
      console.error(chalk.red("[AI ERR]:"), aiErr.message);
    }

    if (checkMonthYear()) {
      await sock.sendMessage(sock.user.id, { text: "🎉 Happy New Month from Spider-Venom!!" });
    }

  } catch (error) {
    console.error(chalk.red("[handleMessage ERR]:"), error.message);
  }
}

module.exports = { handleMessage, handleMessageDelete, cacheMessage, commands, loadPlugins, clearHistory };
