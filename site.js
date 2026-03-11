/**
 * site.js — Spider-Venom Web Server v6
 * Optimized + Secure Admin Panel
 */
const express      = require("express");
const session      = require("express-session");
const crypto       = require("crypto");
const startpairing = require("./pair");
const fs           = require("fs");
const path         = require("path");
const axios        = require("axios");
const { autoLoadPairs }                  = require("./autoload");
const { getAllSessions, getSessionCount } = require("./sessionManager");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Admin Password ─────────────────────────────────────────────────────────────
// Set ADMIN_PASSWORD in your environment variables!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "spider_admin_2024";

// ── Token Store (in-memory) ────────────────────────────────────────────────────
const adminTokens = new Set();
function generateToken() {
  const token = crypto.randomBytes(32).toString("hex");
  adminTokens.add(token);
  setTimeout(() => adminTokens.delete(token), 12 * 60 * 60 * 1000); // 12h expiry
  return token;
}
function isValidToken(token) { return token && adminTokens.has(token); }

// ── Event Buffer (live console) ────────────────────────────────────────────────
const eventBuffer = [];
function pushEvent(msg, type = "info") {
  eventBuffer.push({ msg, type, ts: Date.now() });
  if (eventBuffer.length > 100) eventBuffer.shift();
}
global.pushAdminEvent = pushEvent;

// ── File Paths ─────────────────────────────────────────────────────────────────
const pairedNumbersPath = path.join(__dirname, "sesFolder",  "pairedNumbers.json");
const pairingCodePath   = path.join(__dirname, "richstore",  "pairing", "pairing.json");
const usersPath         = path.join(__dirname, "richstore",  "users.json");
const blockListPath     = path.join(__dirname, "richstore",  "blocklist.json");
const settingsPath      = path.join(__dirname, "settings.json");
const cmdBanPath        = path.join(__dirname, "richstore", "cmdban.json");

[pairedNumbersPath, usersPath, blockListPath].forEach((p) => {
  if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
});
if (!fs.existsSync(pairedNumbersPath)) fs.writeFileSync(pairedNumbersPath, JSON.stringify({ numbers: [] }, null, 2));
if (!fs.existsSync(usersPath))         fs.writeFileSync(usersPath,         JSON.stringify({ users: []   }, null, 2));
if (!fs.existsSync(blockListPath))     fs.writeFileSync(blockListPath,     JSON.stringify({ blocked: [] }, null, 2));

// ── Helpers ────────────────────────────────────────────────────────────────────
function readJSON(p, fb = {})   { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } }
function writeJSON(p, d)        { fs.writeFileSync(p, JSON.stringify(d, null, 2)); }
function loadSettings()         { return readJSON(settingsPath, {}); }
function saveSettings(s)        { writeJSON(settingsPath, s); }
function loadNumbers()          { return readJSON(pairedNumbersPath, { numbers: [] }); }
function saveNumber(number) {
  const clean = number.replace(/@s\.whatsapp\.net$/i, "");
  const list  = loadNumbers();
  const nums  = list.numbers.map(n => typeof n === "string" ? n : n.number);
  if (!nums.includes(clean)) { list.numbers.push(clean); writeJSON(pairedNumbersPath, list); }
}

let currentPairingNumber = null;

// ── Middleware ─────────────────────────────────────────────────────────────────
const SESSION_SECRET = process.env.SESSION_SECRET || "venom_symbiote_gabimaru_key_2024";
app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { secure: process.env.NODE_ENV === "production" } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "frontend"), { index: false }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin",  "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-admin-token");
  next();
});

// ── Admin Auth Middleware ──────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"] || req.query.token;
  if (!isValidToken(token)) return res.status(401).json({ success: false, message: "Unauthorized" });
  next();
}

// ── Public Routes ──────────────────────────────────────────────────────────────
app.get("/",      (req, res) => res.sendFile(path.join(__dirname, "frontend", "index.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "frontend", "admin.html")));

app.get("/pair", async (req, res) => {
  let number = (req.query.number || "").replace(/\s+/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(number) || number.length < 7 || number.length > 15)
    return res.status(400).send("Include country code (e.g. 2549012345678).");
  const data = loadNumbers();
  const nums = data.numbers.map(n => typeof n === "string" ? n : n.number);
  if (nums.includes(number)) return res.status(409).send("Number already paired.");
  if (nums.length >= 5)      return res.status(403).send("Maximum of 5 paired numbers reached.");
  currentPairingNumber = number;
  try {
    await startpairing(number);
    saveNumber(number);
    pushEvent(`Pairing started for +${number}`, "info");
    res.send("Pairing started. Check /pairing-code.");
  } catch (e) { res.status(500).send("Pairing failed: " + e.message); }
});

app.get("/pairing-code", (req, res) => {
  try {
    if (fs.existsSync(pairingCodePath)) {
      const data = JSON.parse(fs.readFileSync(pairingCodePath, "utf8"));
      return res.json({ code: data.code, number: currentPairingNumber });
    }
    res.status(404).json({ error: "Pairing code not yet available" });
  } catch { res.status(500).json({ error: "Error reading pairing code" }); }
});

app.get("/paired", (req, res) => {
  try {
    const sessions = getAllSessions().map(([n]) => n.replace(/@s\.whatsapp\.net$/i, ""));
    const data     = loadNumbers();
    const nums     = data.numbers.map(n => typeof n === "string" ? n : n.number);
    res.json({ numbers: nums.map(n => ({ number: n, active: sessions.includes(n) })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/paired/:number", (req, res) => {
  const number = req.params.number;
  try {
    const data    = loadNumbers();
    const updated = { numbers: data.numbers.filter((n) => (typeof n === "string" ? n : n.number) !== number) };
    writeJSON(pairedNumbersPath, updated);
    const folder = path.join(__dirname, "richstore", "pairing", number);
    if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true });
    pushEvent(`Session removed: +${number}`, "warn");
    res.json({ success: true, message: `Removed ${number}.` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get("/ses-status", (req, res) => {
  const sessions = getAllSessions();
  res.json({ success: true, totalSessions: sessions.length, sessions: sessions.map(([n]) => ({ number: n.replace(/@s\.whatsapp\.net$/i, ""), status: "active" })) });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), sessions: getSessionCount(), memory: process.memoryUsage().heapUsed });
});

// ── Admin Auth ─────────────────────────────────────────────────────────────────
app.post("/admin/auth", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: "Password required" });
  const given   = crypto.createHash("sha256").update(password).digest("hex");
  const correct = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest("hex");
  if (given !== correct) {
    pushEvent("Failed admin login attempt", "error");
    return res.status(401).json({ success: false, message: "Incorrect password" });
  }
  const token = generateToken();
  pushEvent("Admin logged in", "success");
  res.json({ success: true, token });
});

app.get("/admin/verify", (req, res) => {
  res.json({ valid: isValidToken(req.headers["x-admin-token"]) });
});

// ── Protected Admin Routes ─────────────────────────────────────────────────────
app.get("/admin/stats", requireAdmin, (req, res) => {
  const data  = loadNumbers();
  const nums  = data.numbers.map(n => typeof n === "string" ? n : n.number);
  let cmdCount = 0;
  try { const g = require("./gabi"); cmdCount = g.commands.size; } catch {}
  res.json({ success: true, sessions: getSessionCount(), uptime: process.uptime(), numbers: nums.length, commands: cmdCount });
});

app.get("/admin/events", requireAdmin, (req, res) => {
  const since  = parseInt(req.query.since) || 0;
  const events = eventBuffer.filter(e => e.ts > since);
  res.json({ events, lastTs: eventBuffer.length ? eventBuffer[eventBuffer.length-1].ts : 0 });
});

// Blocks
app.get("/admin/blocks", requireAdmin, (req, res) => res.json({ success: true, blocked: readJSON(blockListPath, { blocked: [] }).blocked }));
app.post("/admin/blocks", requireAdmin, (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ success: false, message: "Number required" });
  const clean = number.replace(/\D/g, "");
  const data  = readJSON(blockListPath, { blocked: [] });
  if (data.blocked.includes(clean)) return res.json({ success: false, message: "Already blocked" });
  data.blocked.push(clean);
  writeJSON(blockListPath, data);
  pushEvent(`Blocked: +${clean}`, "warn");
  res.json({ success: true });
});
app.delete("/admin/blocks/:number", requireAdmin, (req, res) => {
  const data = readJSON(blockListPath, { blocked: [] });
  data.blocked = data.blocked.filter(n => n !== req.params.number);
  writeJSON(blockListPath, data);
  pushEvent(`Unblocked: +${req.params.number}`, "info");
  res.json({ success: true });
});

// Sudo
app.get("/admin/sudo", requireAdmin, (req, res) => res.json({ success: true, sudo: loadSettings().sudo || [] }));
app.post("/admin/sudo", requireAdmin, (req, res) => {
  const { number } = req.body;
  if (!number) return res.status(400).json({ success: false, message: "Number required" });
  const jid = `${number.replace(/\D/g,"")}@s.whatsapp.net`;
  const s   = loadSettings();
  s.sudo    = s.sudo || [];
  if (s.sudo.includes(jid)) return res.json({ success: false, message: "Already sudo" });
  s.sudo.push(jid);
  saveSettings(s);
  pushEvent(`Sudo added: ${jid}`, "success");
  res.json({ success: true });
});
app.delete("/admin/sudo/:jid", requireAdmin, (req, res) => {
  const jid = decodeURIComponent(req.params.jid);
  const s   = loadSettings();
  s.sudo    = (s.sudo || []).filter(x => x !== jid);
  saveSettings(s);
  pushEvent(`Sudo removed: ${jid}`, "warn");
  res.json({ success: true });
});

// Command bans
app.get("/admin/cmdbans", requireAdmin, (req, res) => {
  const data = readJSON(cmdBanPath, { global: [] });
  res.json({ success: true, bans: Array.isArray(data.global) ? data.global : [] });
});
app.post("/admin/cmdbans", requireAdmin, (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ success: false, message: "Command required" });
  const data = readJSON(cmdBanPath, { global: [] });
  if (!Array.isArray(data.global)) data.global = [];
  if (data.global.includes(command)) return res.json({ success: false, message: "Already banned" });
  data.global.push(command);
  writeJSON(cmdBanPath, data);
  pushEvent(`Command banned: .${command}`, "warn");
  res.json({ success: true });
});
app.delete("/admin/cmdbans/:cmd", requireAdmin, (req, res) => {
  const data = readJSON(cmdBanPath, { global: [] });
  if (!Array.isArray(data.global)) data.global = [];
  data.global = data.global.filter(c => c !== req.params.cmd);
  writeJSON(cmdBanPath, data);
  pushEvent(`Command unbanned: .${req.params.cmd}`, "info");
  res.json({ success: true });
});

// Settings
app.get("/admin/settings",   requireAdmin, (req, res) => res.json({ success: true, settings: loadSettings() }));
app.patch("/admin/settings", requireAdmin, (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ success: false, message: "Key required" });
  const s = loadSettings();
  if (key === "identity") { if (value.botName) s.botName = value.botName; if (value.prefix) s.prefix = value.prefix; }
  else s[key] = value;
  saveSettings(s);
  pushEvent(`Setting updated: ${key}`, "info");
  res.json({ success: true });
});

// Send message
app.post("/admin/send", requireAdmin, async (req, res) => {
  const { jid, message } = req.body;
  if (!jid || !message) return res.status(400).json({ success: false, message: "jid and message required" });
  try {
    const sessions = getAllSessions();
    if (!sessions.length) return res.json({ success: false, message: "No active session" });
    const [, sock] = sessions[0];
    const target   = jid === "me" ? sock.user.id : jid;
    await sock.sendMessage(target, { text: message });
    pushEvent(`Message sent to ${target}`, "cmd");
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Broadcast
app.post("/admin/broadcast", requireAdmin, async (req, res) => {
  const { message, target } = req.body;
  if (!message) return res.status(400).json({ success: false, message: "Message required" });
  try {
    const sessions = getAllSessions();
    if (!sessions.length) return res.json({ success: false, message: "No active sessions" });
    let sent = 0;
    for (const [, sock] of sessions) {
      try {
        const groups = await sock.groupFetchAllParticipating();
        if (target === "all" || !target) {
          for (const [id] of Object.entries(groups)) {
            await sock.sendMessage(id, { text: message });
            sent++;
            await new Promise(r => setTimeout(r, 500)); // rate limit
          }
        }
      } catch {}
    }
    pushEvent(`Broadcast sent to ${sent} group(s)`, "success");
    res.json({ success: true, message: `Sent to ${sent} group(s)` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Actions
app.post("/admin/action", requireAdmin, (req, res) => {
  const { action } = req.body;
  pushEvent(`Admin action: ${action}`, "warn");
  if (action === "clear-cache") {
    try { const g = require("./gabi"); g.apiCache.flushAll(); return res.json({ success: true, message: "Cache cleared" }); }
    catch { return res.json({ success: false, message: "Could not clear cache" }); }
  }
  if (action === "reload-plugins") {
    try {
      const pluginsDir = path.join(__dirname, "gabi-plugins");
      const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"));
      files.forEach(f => { delete require.cache[require.resolve(path.join(pluginsDir, f))]; });
      const g = require("./gabi");
      g.commands.clear();
      files.forEach(f => {
        try {
          const p = require(path.join(pluginsDir, f));
          if (!p.command) return;
          const aliases = Array.isArray(p.command) ? p.command : [p.command];
          aliases.forEach(a => g.commands.set(a.toLowerCase(), p));
        } catch {}
      });
      pushEvent(`Plugins reloaded: ${g.commands.size} commands`, "success");
      return res.json({ success: true, message: `Reloaded — ${g.commands.size} commands` });
    } catch (e) { return res.json({ success: false, message: e.message }); }
  }
  if (action === "restart") { res.json({ success: true, message: "Restarting..." }); setTimeout(() => process.exit(0), 500); return; }
  if (action === "stop")    { res.json({ success: true, message: "Stopping..." });   setTimeout(() => process.exit(1), 500); return; }
  res.status(400).json({ success: false, message: "Unknown action" });
});

// Danger zone
app.post("/admin/danger", requireAdmin, (req, res) => {
  const { action } = req.body;
  pushEvent(`DANGER: ${action}`, "error");
  if (action === "disconnect-all") {
    try {
      writeJSON(pairedNumbersPath, { numbers: [] });
      const pd = path.join(__dirname, "richstore", "pairing");
      fs.readdirSync(pd, { withFileTypes: true }).filter(d => d.isDirectory() && /^\d+$/.test(d.name))
        .forEach(d => fs.rmSync(path.join(pd, d.name), { recursive: true, force: true }));
      return res.json({ success: true, message: "All sessions disconnected" });
    } catch (e) { return res.json({ success: false, message: e.message }); }
  }
  if (action === "clear-warnings") {
    try { const wp = path.join(__dirname, "richstore", "warnings.json"); if (fs.existsSync(wp)) writeJSON(wp, {}); return res.json({ success: true, message: "Warnings cleared" }); }
    catch (e) { return res.json({ success: false, message: e.message }); }
  }
  if (action === "clear-blocks") { writeJSON(blockListPath, { blocked: [] }); return res.json({ success: true, message: "Block list cleared" }); }
  if (action === "factory-reset") {
    try {
      writeJSON(pairedNumbersPath, { numbers: [] });
      writeJSON(blockListPath,     { blocked: [] });
      writeJSON(usersPath,         { users: [] });
      const wp = path.join(__dirname, "richstore", "warnings.json");
      if (fs.existsSync(wp)) writeJSON(wp, {});
      return res.json({ success: true, message: "Factory reset complete" });
    } catch (e) { return res.json({ success: false, message: e.message }); }
  }
  res.status(400).json({ success: false, message: "Unknown action" });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`\x1b[35m[SPIDER] Web server on port ${PORT}\x1b[0m`);
  console.log(`\x1b[33m[SPIDER] Admin panel → http://localhost:${PORT}/admin\x1b[0m`);
  if (!process.env.ADMIN_PASSWORD) console.log(`\x1b[31m[WARN] Set ADMIN_PASSWORD env var! Currently using default.\x1b[0m`);
  if (!process.env.DYNO) {
    try { const ip = (await axios.get("https://api.ipify.org?format=json", { timeout: 3000 })).data.ip; console.log(`\x1b[36mPublic URL: http://${ip}:${PORT}\x1b[0m`); } catch {}
  }
  await autoLoadPairs();
  pushEvent("Bot server started", "success");
});

process.on("uncaughtException",  e => { console.error("[uncaughtException]",  e); pushEvent(`Error: ${e.message}`, "error"); });
process.on("unhandledRejection", e => { console.error("[unhandledRejection]", e); pushEvent(`Rejection: ${e}`, "error"); });

// ── AI Memory Management (added in v7) ────────────────────────────────────────
const aiMemoryPath = path.join(__dirname, "richstore", "ai_memory.json");

app.get("/admin/ai-memory", requireAdmin, (req, res) => {
  try {
    const mem = fs.existsSync(aiMemoryPath)
      ? JSON.parse(fs.readFileSync(aiMemoryPath, "utf8"))
      : {};
    const summary = Object.entries(mem).map(([chatId, msgs]) => ({
      chatId,
      exchanges: Math.floor(msgs.length / 2),
      lastMsg: msgs[msgs.length - 1]?.content?.slice(0, 60) || ""
    }));
    res.json({ success: true, chats: summary.length, memory: summary });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete("/admin/ai-memory/:chatId", requireAdmin, (req, res) => {
  try {
    const chatId = decodeURIComponent(req.params.chatId);
    const mem = fs.existsSync(aiMemoryPath)
      ? JSON.parse(fs.readFileSync(aiMemoryPath, "utf8"))
      : {};
    if (chatId === "all") {
      fs.writeFileSync(aiMemoryPath, "{}");
      pushEvent("All AI memory cleared", "warn");
      return res.json({ success: true, message: "All AI memory cleared" });
    }
    delete mem[chatId];
    fs.writeFileSync(aiMemoryPath, JSON.stringify(mem, null, 2));
    pushEvent(`AI memory cleared for ${chatId}`, "info");
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Plugin list endpoint (added in v7) ────────────────────────────────────────
app.get("/admin/plugins", requireAdmin, (req, res) => {
  try {
    const pluginsDir = path.join(__dirname, "gabi-plugins");
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"));
    let g;
    try { g = require("./gabi"); } catch {}
    const plugins = files.map(f => {
      let commands = [];
      try {
        const p = require(path.join(pluginsDir, f));
        commands = Array.isArray(p.command) ? p.command : [p.command].filter(Boolean);
      } catch {}
      return { file: f, commands };
    });
    res.json({ success: true, total: g?.commands?.size || 0, plugins });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
