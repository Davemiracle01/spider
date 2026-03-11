/**
 * grouprules.js — Set and display group rules
 */
const fs = require('fs');
const path = require('path');
const { react01, error01 } = require('../lib/extra');

const rulesPath = path.join(__dirname, '..', 'richstore', 'grouprules.json');
function loadRules() { try { if (!fs.existsSync(rulesPath)) fs.writeFileSync(rulesPath, '{}'); return JSON.parse(fs.readFileSync(rulesPath, 'utf8')); } catch { return {}; } }
function saveRules(d) { fs.writeFileSync(rulesPath, JSON.stringify(d, null, 2)); }

module.exports = {
  command: ['rules', 'setrules', 'clearrules'],
  description: 'Set and display group rules',
  category: 'Group Menu',
  isGroup: true,

  async run({ sock, msg, from, commandName, text, isAdmin }) {
    const db = loadRules();

    if (commandName === 'setrules') {
      if (!isAdmin) return sock.sendMessage(from, { text: '❌ Only admins can set rules.' }, { quoted: msg });
      if (!text) {
        return sock.sendMessage(from, {
          text: `📝 *Usage:* .setrules <your rules>\n\nExample:\n.setrules 1. Be respectful\n2. No spam\n3. No NSFW`
        }, { quoted: msg });
      }
      db[from] = text;
      saveRules(db);
      await react01(sock, from, msg.key, 1000);
      return sock.sendMessage(from, { text: `✅ Group rules have been updated!` }, { quoted: msg });
    }

    if (commandName === 'clearrules') {
      if (!isAdmin) return sock.sendMessage(from, { text: '❌ Only admins can clear rules.' }, { quoted: msg });
      delete db[from];
      saveRules(db);
      await react01(sock, from, msg.key, 1000);
      return sock.sendMessage(from, { text: '✅ Group rules cleared.' }, { quoted: msg });
    }

    // .rules — display
    await react01(sock, from, msg.key, 800);
    const meta = await sock.groupMetadata(from);
    const rules = db[from];

    if (!rules) {
      return sock.sendMessage(from, {
        text: `📋 *No rules set for this group yet.*\n\n_Admins can use *.setrules* to add rules._`
      }, { quoted: msg });
    }

    await sock.sendMessage(from, {
      text: `╭───❖ 📋 Group Rules ❖───\n│ 🏠 *${meta.subject}*\n╰─────────────────\n\n${rules}\n\n_Please follow these rules to keep the group positive!_ 🙏`
    }, { quoted: msg });
  }
};
