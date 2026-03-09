/**
 * site.js — Gabimaru Web Server (Heroku-Optimized)
 * Fixed: session cookie secure flag + trust proxy for Heroku HTTPS
 */
const express   = require("express");
const session   = require("express-session");
const startpairing = require("./pair");
const fs        = require("fs");
const path      = require("path");
const axios     = require("axios");
const { autoLoadPairs }          = require("./autoload");
const { getAllSessions, getSessionCount } = require("./sessionManager");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CRITICAL for Heroku: trust the proxy so HTTPS is detected correctly ────────
// Without this, secure cookies are never sent because Express sees HTTP (not HTTPS)
// from Heroku's load balancer, and the session breaks on every request.
app.set("trust proxy", 1);

// ── File Paths ─────────────────────────────────────────────────────────────────
const pairedNumbersPath = path.join(__dirname, "sesFolder",  "pairedNumbers.json");
const pairingCodePath   = path.join(__dirname, "richstore",  "pairing", "pairing.json");
const usersPath         = path.join(__dirname, "richstore",  "users.json");

[pairedNumbersPath, usersPath].forEach((p) => {
  if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
});
if (!fs.existsSync(pairedNumbersPath)) fs.writeFileSync(pairedNumbersPath, JSON.stringify({ numbers: [] }, null, 2));
if (!fs.existsSync(usersPath))         fs.writeFileSync(usersPath,         JSON.stringify({ users: []   }, null, 2));

// ── Middleware ─────────────────────────────────────────────────────────────────
const SESSION_SECRET = process.env.SESSION_SECRET || "venom_symbiote_gabimaru_key_2025";

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,      // Only create sessions for authenticated users
  cookie: {
    secure: !!process.env.DYNO,  // true on Heroku (DYNO env var is set automatically), false locally
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days so sessions survive dyno restarts
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "frontend"), { index: false }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin",  "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// ── Helpers ────────────────────────────────────────────────────────────────────
let currentPairingNumber = null;

function loadUsers()       { try { return JSON.parse(fs.readFileSync(usersPath, "utf8")).users || []; } catch { return []; } }
function saveUsers(users)  { fs.writeFileSync(usersPath, JSON.stringify({ users }, null, 2)); }
function saveNumber(number) {
  const clean = number.replace(/@s\.whatsapp\.net$/i, "");
  let list = { numbers: [] };
  try { if (fs.existsSync(pairedNumbersPath)) list = JSON.parse(fs.readFileSync(pairedNumbersPath, "utf8")); } catch {}
  if (!list.numbers.includes(clean)) { list.numbers.push(clean); fs.writeFileSync(pairedNumbersPath, JSON.stringify(list, null, 2)); }
}
function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  return res.redirect("/login.html");
}

// ── Routes ─────────────────────────────────────────────────────────────────────
app.get("/",          (req, res) => res.redirect("/login.html"));
app.get("/home",      requireLogin, (req, res) => res.sendFile(path.join(__dirname, "frontend", "index.html")));
app.get("/dashboard", requireLogin, (req, res) => res.sendFile(path.join(__dirname, "frontend", "dashboard.html")));

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: "All fields required." });
  const users = loadUsers();
  if (users.find((u) => u.username === username)) return res.status(409).json({ success: false, message: "Username already exists." });
  users.push({ username, password, pairings: [] });
  saveUsers(users);
  req.session.loggedIn = true;
  req.session.username = username;
  req.session.save((err) => {
    if (err) return res.status(500).json({ success: false, message: "Session save failed." });
    res.json({ success: true });
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const match = loadUsers().find((u) => u.username === username && u.password === password);
  if (!match) return res.status(401).json({ success: false, message: "Invalid credentials." });
  req.session.loggedIn  = true;
  req.session.username  = username;
  req.session.save((err) => {
    if (err) return res.status(500).json({ success: false, message: "Session save failed." });
    res.json({ success: true });
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

app.get("/me", (req, res) => {
  if (!req.session || !req.session.loggedIn) return res.status(401).json({ success: false });
  const user = loadUsers().find((u) => u.username === req.session.username);
  if (!user) return res.status(404).json({ success: false });
  res.json({ username: user.username, pairings: user.pairings || [] });
});

app.get("/pair", async (req, res) => {
  if (!req.session || !req.session.loggedIn) return res.status(401).send("Login required");
  let number = (req.query.number || "").replace(/\s+/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(number))              return res.status(400).send("Phone number must contain only digits.");
  if (number.length < 7 || number.length > 15) return res.status(400).send("Include country code (e.g. 254712345678).");

  const users = loadUsers();
  const user  = users.find((u) => u.username === req.session.username);
  if (!user) return res.status(401).send("User not found.");
  if (!user.pairings) user.pairings = [];
  if (user.pairings.includes(number))   return res.status(409).send("Number already paired.");
  if (user.pairings.length >= 5)        return res.status(403).send("Maximum of 5 paired numbers reached.");

  currentPairingNumber = number;
  try {
    await startpairing(number);
    saveNumber(number);
    user.pairings.push(number);
    saveUsers(users);
    res.send("Pairing started. Check /pairing-code.");
  } catch (e) {
    res.status(500).send("Pairing failed: " + e.message);
  }
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

app.delete("/paired/:number", (req, res) => {
  if (!req.session || !req.session.loggedIn) return res.status(401).json({ success: false });
  const number = req.params.number;
  try {
    const data    = JSON.parse(fs.readFileSync(pairedNumbersPath, "utf8"));
    const updated = { numbers: data.numbers.filter((n) => n !== number) };
    fs.writeFileSync(pairedNumbersPath, JSON.stringify(updated, null, 2));
    const users = loadUsers();
    const user  = users.find((u) => u.username === req.session.username);
    if (user) { user.pairings = (user.pairings || []).filter((p) => p !== number); saveUsers(users); }
    const folder = path.join(__dirname, "richstore", "pairing", number);
    if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true });
    res.json({ success: true, message: `Removed ${number}.` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get("/ses-status", (req, res) => {
  const sessions = getAllSessions();
  res.json({
    success: true,
    totalSessions: sessions.length,
    sessions: sessions.map(([n]) => ({ number: n.replace(/@s\.whatsapp\.net$/i, ""), status: "active" })),
  });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    sessions: getSessionCount(),
    memory: process.memoryUsage().heapUsed,
    timestamp: new Date().toISOString()
  });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`\x1b[35m[GABIMARU] Web server running on port ${PORT}\x1b[0m`);
  if (process.env.DYNO) {
    console.log(`\x1b[36mHeroku dyno active. Health: /health · Trust proxy: ON\x1b[0m`);
  }
  await autoLoadPairs();
});

process.on("SIGTERM", () => {
  console.log("[SIGTERM] Shutting down gracefully...");
  process.exit(0);
});

process.on("uncaughtException",  (err) => console.error("[uncaughtException]",  err.message));
process.on("unhandledRejection", (err) => console.error("[unhandledRejection]", err?.message || err));
