/**
 * keepalive.js — Self-ping to prevent Heroku dyno sleep
 * Auto-starts on bot boot. Command shows status.
 */
const axios = require("axios");
let keepaliveInterval = null;
let pingUrl = null;

function startKeepalive(url) {
  if (keepaliveInterval) clearInterval(keepaliveInterval);
  pingUrl = url;
  keepaliveInterval = setInterval(async () => {
    try {
      await axios.get(url, { timeout: 8000 });
      console.log("[keepalive] Pinged:", url);
    } catch (err) {
      console.error("[keepalive] Ping failed:", err.message);
    }
  }, 14 * 60 * 1000); // every 14 minutes
  console.log("[keepalive] Started pinging:", url);
}

// Auto-start if APP_URL is set
if (process.env.APP_URL) {
  startKeepalive(process.env.APP_URL + "/health");
}

module.exports = {
  command: ["keepalive", "ka"],
  description: "Manage keepalive ping to prevent Heroku sleep (owner only)",
  isOwner: true,

  async run({ sock, msg, from, args }) {
    const sub = args[0]?.toLowerCase();

    if (sub === "start") {
      const url = args[1] || process.env.APP_URL;
      if (!url) {
        return sock.sendMessage(from, {
          text: "⚠️ Set APP_URL env var or provide URL:\n.keepalive start https://your-app.herokuapp.com"
        }, { quoted: msg });
      }
      startKeepalive(url + "/health");
      return sock.sendMessage(from, { text: `✅ Keepalive started! Pinging every 14min:\n${url}/health` }, { quoted: msg });
    }

    if (sub === "stop") {
      if (keepaliveInterval) { clearInterval(keepaliveInterval); keepaliveInterval = null; }
      return sock.sendMessage(from, { text: "🔴 Keepalive stopped." }, { quoted: msg });
    }

    const status = keepaliveInterval ? `🟢 Active\n📡 URL: ${pingUrl}` : "🔴 Inactive";
    await sock.sendMessage(from, {
      text: `🔃 *Keepalive Status*\n\n${status}\n\nCommands:\n› *.keepalive start <url>* — Start pinging\n› *.keepalive stop* — Stop`
    }, { quoted: msg });
  }
};
