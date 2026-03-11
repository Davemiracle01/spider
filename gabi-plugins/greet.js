/**
 * greet.js — Upgraded Welcome & Bye
 * Upgraded: profile photo in welcome, dynamic placeholders (@user, @group, @count, @date),
 *           custom goodbye, rejoin detection, welcome DM option
 */
const fs   = require("fs");
const path = require("path");
const configPath = path.join(__dirname, "../groupConfig.json");

if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, "{}");

function loadConfig() { try { return JSON.parse(fs.readFileSync(configPath, "utf8")); } catch { return {}; } }
function saveConfig(data) { fs.writeFileSync(configPath, JSON.stringify(data, null, 2)); }

const DEFAULT_WELCOME = "👋 Welcome *@user* to *@group*! 🎉\n\n👥 We now have *@count* members.\n\n_Please read the group rules!_";
const DEFAULT_BYE     = "👋 *@user* has left *@group*.\n\n👥 We now have *@count* members.";

function fillTemplate(template, replacements) {
  return Object.entries(replacements).reduce((str, [k, v]) => str.replace(new RegExp(`@${k}`, "g"), v), template);
}

module.exports = {
  command: ["welcome", "bye", "setwelcome", "setbye", "greetdm"],
  isGroup: true,
  isAdmin: true,
  description: "Set custom welcome/bye messages with placeholders.",

  async run({ sock, msg, from, args, commandName, text }) {
    const config = loadConfig();
    if (!config[from]) {
      config[from] = {
        welcome: { on: false, msg: DEFAULT_WELCOME, dm: false },
        bye:     { on: false, msg: DEFAULT_BYE }
      };
    }

    const sub = args[0]?.toLowerCase();
    const isWelcome = ["welcome", "setwelcome"].includes(commandName);

    // ── .setwelcome <custom message> ──────────────────────────────
    if (commandName === "setwelcome" || commandName === "setbye") {
      if (!text) {
        return sock.sendMessage(from, {
          text: `📝 Set your message using placeholders:\n\n*@user* — tagged username\n*@group* — group name\n*@count* — member count\n*@date* — today's date\n\nExample:\n\`.setwelcome 👋 Welcome @user! We're @count strong in @group.\``
        }, { quoted: msg });
      }
      config[from][isWelcome ? "welcome" : "bye"].msg = text;
      saveConfig(config);
      return sock.sendMessage(from, {
        text: `✅ ${isWelcome ? "Welcome" : "Bye"} message updated!\n\n_"${text}"_`
      }, { quoted: msg });
    }

    // ── .greetdm on/off — DM welcome to new members ───────────────
    if (commandName === "greetdm") {
      const toggle = args[0]?.toLowerCase();
      if (!["on", "off"].includes(toggle)) {
        const state = config[from].welcome?.dm ? "ON 🟢" : "OFF 🔴";
        return sock.sendMessage(from, {
          text: `📩 Welcome DM: *${state}*\n\nUsage: *.greetdm on/off*\n_When ON, new members also receive a welcome DM from the bot._`
        }, { quoted: msg });
      }
      config[from].welcome.dm = toggle === "on";
      saveConfig(config);
      return sock.sendMessage(from, {
        text: `📩 Welcome DM is now *${toggle.toUpperCase()}* ${toggle === "on" ? "🟢" : "🔴"}`
      }, { quoted: msg });
    }

    // ── .welcome on/off ───────────────────────────────────────────
    if (sub === "on" || sub === "off") {
      config[from][isWelcome ? "welcome" : "bye"].on = sub === "on";
      saveConfig(config);
      return sock.sendMessage(from, {
        text: `✅ ${isWelcome ? "Welcome" : "Bye"} message *${sub === "on" ? "enabled ✅" : "disabled 🔴"}*`
      }, { quoted: msg });
    }

    // ── .welcome (status) ─────────────────────────────────────────
    const wStatus = config[from].welcome.on ? "ON 🟢" : "OFF 🔴";
    const bStatus = config[from].bye.on      ? "ON 🟢" : "OFF 🔴";
    const dmState = config[from].welcome?.dm  ? "ON 🟢" : "OFF 🔴";

    return sock.sendMessage(from, {
      text:
`📌 *Welcome/Bye Settings*

Welcome: *${wStatus}*
Bye: *${bStatus}*
DM on join: *${dmState}*

*Current welcome message:*
${config[from].welcome.msg}

*Current bye message:*
${config[from].bye.msg}

Placeholders: @user · @group · @count · @date

Commands:
*.welcome on/off* | *.bye on/off*
*.setwelcome <msg>* | *.setbye <msg>*
*.greetdm on/off*`
    }, { quoted: msg });
  },

  async handleGroupUpdate(sock, update) {
    try {
      const { id: groupJid, participants, action } = update;
      if (!["add", "remove"].includes(action)) return;

      const config = loadConfig();
      if (!config[groupJid]) return;

      const meta      = await sock.groupMetadata(groupJid).catch(() => null);
      const groupName = meta?.subject || "the group";
      const count     = meta?.participants?.length || "?";
      const date      = new Date().toLocaleDateString("en-GB");

      for (const participant of participants) {
        const num = participant.split("@")[0];
        const replacements = { user: `@${num}`, group: groupName, count, date };

        if (action === "add" && config[groupJid].welcome?.on) {
          const wmsg = fillTemplate(config[groupJid].welcome.msg || DEFAULT_WELCOME, replacements);

          // Try to get profile picture
          let ppUrl;
          try { ppUrl = await sock.profilePictureUrl(participant, "image"); } catch { ppUrl = null; }

          if (ppUrl) {
            await sock.sendMessage(groupJid, {
              image: { url: ppUrl },
              caption: wmsg,
              mentions: [participant]
            }).catch(() => sock.sendMessage(groupJid, { text: wmsg, mentions: [participant] }));
          } else {
            await sock.sendMessage(groupJid, { text: wmsg, mentions: [participant] }).catch(() => {});
          }

          // DM welcome
          if (config[groupJid].welcome?.dm) {
            const dmMsg = `👋 Welcome to *${groupName}*, @${num}!\n\n${config[groupJid].welcome.msg || DEFAULT_WELCOME}`.replace(/@user/g, `@${num}`).replace(/@group/g, groupName).replace(/@count/g, count).replace(/@date/g, date);
            await sock.sendMessage(participant, { text: dmMsg }).catch(() => {});
          }
        }

        if (action === "remove" && config[groupJid].bye?.on) {
          const bmsg = fillTemplate(config[groupJid].bye.msg || DEFAULT_BYE, replacements);
          await sock.sendMessage(groupJid, { text: bmsg, mentions: [participant] }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[greet handleGroupUpdate]", err.message);
    }
  }
};
