/**
 * greet.js — Welcome & Bye messages for group events
 */
const fs   = require("fs");
const path = require("path");
const configPath = path.join(__dirname, "../groupConfig.json");

if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, "{}");

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, "utf8")); } catch { return {}; }
}
function saveConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

module.exports = {
  command: ["welcome", "bye"],
  isGroup: true,
  isAdmin: true,
  description: "Set welcome/bye messages or toggle them",

  async run({ sock, msg, from, args, commandName }) {
    const config = loadConfig();
    const sub = args[0]?.toLowerCase();
    const isWelcome = commandName === "welcome";

    if (!config[from]) {
      config[from] = {
        welcome: { on: false, msg: "👋 Welcome @user to *@group*! 🎉" },
        bye: { on: false, msg: "👋 *@user* has left the group." }
      };
    }

    if (sub === "on" || sub === "off") {
      config[from][isWelcome ? "welcome" : "bye"].on = sub === "on";
      saveConfig(config);
      return sock.sendMessage(from, {
        text: `✅ ${isWelcome ? "Welcome" : "Bye"} message *${sub === "on" ? "enabled ✅" : "disabled 🔴"}*`
      }, { quoted: msg });
    }

    if (args.length > 0) {
      config[from][isWelcome ? "welcome" : "bye"].msg = args.join(" ");
      saveConfig(config);
      return sock.sendMessage(from, {
        text: `✅ ${isWelcome ? "Welcome" : "Bye"} message updated:\n${args.join(" ")}`
      }, { quoted: msg });
    }

    const wStatus = config[from].welcome.on ? "ON 🟢" : "OFF 🔴";
    const bStatus = config[from].bye.on      ? "ON 🟢" : "OFF 🔴";

    return sock.sendMessage(from, {
      text:
`📌 *Welcome/Bye Settings*

Welcome: *${wStatus}*
Bye: *${bStatus}*

Usage:
*.welcome on/off* — Toggle
*.welcome <msg>* — Set message (use @user for mention)
*.bye on/off* — Toggle
*.bye <msg>* — Set message`
    }, { quoted: msg });
  },

  // Called from pair.js on group-participants.update
  async handleGroupUpdate(sock, update) {
    try {
      const { id: groupJid, participants, action } = update;
      if (!["add","remove"].includes(action)) return;

      const config = loadConfig();
      if (!config[groupJid]) return;

      const meta = await sock.groupMetadata(groupJid).catch(() => null);
      const groupName = meta?.subject || "the group";

      for (const participant of participants) {
        const num = participant.split("@")[0];

        if (action === "add" && config[groupJid].welcome?.on) {
          const wmsg = (config[groupJid].welcome.msg || "👋 Welcome @user!")
            .replace("@user", `@${num}`)
            .replace("@group", groupName);
          await sock.sendMessage(groupJid, {
            text: wmsg,
            mentions: [participant]
          }).catch(() => {});
        }

        if (action === "remove" && config[groupJid].bye?.on) {
          const bmsg = (config[groupJid].bye.msg || "👋 @user has left.")
            .replace("@user", `@${num}`)
            .replace("@group", groupName);
          await sock.sendMessage(groupJid, {
            text: bmsg,
            mentions: [participant]
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[greet handleGroupUpdate]", err.message);
    }
  }
};
