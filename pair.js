/**
 * pair.js — Heroku-optimized session manager
 * - Persistent reconnection (no max retry cap on network drops)
 * - Exponential backoff to avoid spam reconnects
 * - Sessions stored in filesystem (use Heroku addon or mount)
 */
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  Browsers
} = require("@whiskeysockets/baileys");

const { Boom } = require("@hapi/boom");
const pino     = require("pino");
const fs       = require("fs");
const path     = require("path");
const chalk    = require("chalk");

const { addSession, removeSession, updateSessionStatus } = require("./sessionManager");
const { handleMessage, handleMessageDelete, cacheMessage } = require("./gabi");

const pairingCodePath = path.join(__dirname, "./richstore/pairing/pairing.json");

// Track reconnect backoff per number
const backoffMap = {};

function getBackoff(number) {
  backoffMap[number] = Math.min((backoffMap[number] || 1000) * 1.5, 30000);
  return backoffMap[number];
}
function resetBackoff(number) { backoffMap[number] = 1000; }

function deleteFolderRecursive(folderPath) {
  if (!fs.existsSync(folderPath)) return;
  for (const file of fs.readdirSync(folderPath)) {
    const cur = path.join(folderPath, file);
    fs.lstatSync(cur).isDirectory() ? deleteFolderRecursive(cur) : fs.unlinkSync(cur);
  }
  fs.rmdirSync(folderPath);
}

async function startpairing(number) {
  const sessionPath = path.join(__dirname, `richstore/pairing/${number}`);
  fs.mkdirSync(sessionPath, { recursive: true });

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.ubuntu("Edge"),
    syncFullHistory: false,
    getMessage: async () => ({ conversation: "" }),
    // Keep connections alive on Heroku
    keepAliveIntervalMs: 25000,
  });

  /* ── Pairing Code ── */
  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(number.replace(/[^0-9]/g, ""), "GABIMARU");
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        fs.writeFileSync(pairingCodePath, JSON.stringify({ code, number }, null, 2));
        console.log(chalk.magentaBright(`Pairing code for ${number}: ${code}`));
      } catch (err) {
        console.log(chalk.red(`Pairing code error for ${number}:`), err.message);
      }
    }, 1800);
  }

  /* ── Connection Events ── */
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      updateSessionStatus(number, false);
      console.log(chalk.yellow(`Connection closed for ${number}. Reason: ${reason}`));

      if (reason === DisconnectReason.loggedOut) {
        deleteFolderRecursive(sessionPath);
        removeSession(number);
        console.log(chalk.red(`${number} logged out. Session deleted.`));
        return; // Don't reconnect on logout
      }

      if (reason === DisconnectReason.connectionReplaced) {
        console.log(chalk.yellow(`${number}: connection replaced (another device connected)`));
        return;
      }

      // All other reasons: reconnect with backoff (never give up)
      const delay = getBackoff(number);
      console.log(chalk.cyan(`Reconnecting ${number} in ${Math.round(delay/1000)}s...`));
      setTimeout(() => startpairing(number), delay);
    }

    else if (connection === "open") {
      resetBackoff(number);
      addSession(number, sock);
      console.log(chalk.green(`✅ Session bonded: ${number}`));
    }
  });

  /* ── Credentials ── */
  sock.ev.on("creds.update", saveCreds);

  /* ── Messages ── */
  sock.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages?.[0];
      if (msg?.key?.id && msg?.message) {
        const type = Object.keys(msg.message)[0];
        const body =
          type === "conversation"        ? msg.message.conversation :
          type === "extendedTextMessage" ? msg.message.extendedTextMessage.text : "";
        if (body) cacheMessage(msg.key.id, body);
      }
    } catch {}
    handleMessage(sock, m);
  });

  sock.ev.on("messages.delete", async (update) => {
    handleMessageDelete(sock, update);
  });

  sock.ev.on("group-participants.update", async (update) => {
    try {
      const { handleGroupUpdate } = require("./gabi-plugins/greet");
      await handleGroupUpdate(sock, update);
    } catch {}
  });

  return sock;
}

module.exports = startpairing;
