/**
 * viewstatus.js — Auto-view all contacts' statuses
 */
module.exports = {
  command: ["viewstatus", "vs"],
  description: "Enable/disable auto-viewing all contacts' statuses (owner only)",
  isOwner: true,

  async run({ sock, msg, from, args }) {
    const toggle = args[0]?.toLowerCase();

    if (toggle === "on") {
      sock._autoViewStatus = true;
      return sock.sendMessage(from, {
        text: "👁️ *Auto View Status ON*\n\nBot will silently view all statuses."
      }, { quoted: msg });
    }

    if (toggle === "off") {
      sock._autoViewStatus = false;
      return sock.sendMessage(from, { text: "🔴 Auto View Status OFF." }, { quoted: msg });
    }

    const state = sock._autoViewStatus ? "ON 🟢" : "OFF 🔴";
    await sock.sendMessage(from, {
      text: `👁️ *View Status*\n\nCurrent: *${state}*\n\nUsage:\n› *.vs on* — Enable\n› *.vs off* — Disable`
    }, { quoted: msg });
  }
};
