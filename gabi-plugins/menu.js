const fs = require('fs');
const path = require('path');
const { react01 } = require('../lib/extra');

// Monospace font mapping
const mono = {
  A:'𝙰',B:'𝙱',C:'𝙲',D:'𝙳',E:'𝙴',F:'𝙵',G:'𝙶',H:'𝙷',I:'𝙸',J:'𝙹',
  K:'𝙺',L:'𝙻',M:'𝙼',N:'𝙽',O:'𝙾',P:'𝙿',Q:'𝚀',R:'𝚁',S:'𝚂',T:'𝚃',
  U:'𝚄',V:'𝚅',W:'𝚆',X:'𝚇',Y:'𝚈',Z:'𝚉',
  a:'𝚊',b:'𝚋',c:'𝚌',d:'𝚍',e:'𝚎',f:'𝚏',g:'𝚐',h:'𝚑',i:'𝚒',j:'𝚓',
  k:'𝚔',l:'𝚕',m:'𝚖',n:'𝚗',o:'𝚘',p:'𝚙',q:'𝚚',r:'𝚛',s:'𝚜',t:'𝚝',
  u:'𝚞',v:'𝚟',w:'𝚠',x:'𝚡',y:'𝚢',z:'𝚣',
  '0':'𝟶','1':'𝟷','2':'𝟸','3':'𝟹','4':'𝟺','5':'𝟻','6':'𝟼','7':'𝟽','8':'𝟾','9':'𝟿',
  ' ':' ','!':'!','?':'?','.':'.',',':',',':':',';':';','-':'-','_':'_','/':'/',
  '(':'(',')'.')','[':'[',']':']','{':'{','}':'}','<':'<','>':'>','*':'*','#':'#'
};
function toMono(t) { return String(t).split('').map(c => mono[c] || c).join(''); }

// Category config with emojis
const CATEGORIES = [
  { name: 'Owner Menu',    emoji: '👑', keys: ['isOwner'] },
  { name: 'Admin Menu',    emoji: '🛡️', keys: ['isAdmin'] },
  { name: 'Group Menu',    emoji: '👥', keys: ['isGroup'] },
  { name: 'Helper Menu',   emoji: '🧠', keys: [] },
  { name: 'Download Menu', emoji: '⬇️', keys: [] },
  { name: 'Media Menu',    emoji: '🎨', keys: [] },
  { name: 'Fun Menu',      emoji: '🎮', keys: [] },
  { name: 'Utility',       emoji: '🔧', keys: [] },
  { name: 'General Menu',  emoji: '📦', keys: [] },
];

module.exports = {
  command: ['menu', 'help', 'cmd', 'commands', 'ℹ️'],
  description: 'Show all available commands',
  category: 'General Menu',

  async run({ sock, msg, from, settings, isOwner, isSudo, args }) {
    await react01(sock, from, msg.key, 800);

    const pluginsDir = path.join(__dirname);
    const pluginFiles = fs.readdirSync(pluginsDir).filter(f =>
      f.endsWith('.js') && !['menu.js', 'chatbot.js'].includes(f)
    );

    const commands = new Map();
    let totalAliases = 0;

    for (const file of pluginFiles) {
      try {
        const pluginPath = path.join(pluginsDir, file);
        delete require.cache[require.resolve(pluginPath)];
        const plugin = require(pluginPath);
        if (!plugin.command) continue;
        const aliases = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        const main = aliases[0];
        commands.set(main, {
          aliases,
          description: plugin.description || 'No description',
          category: plugin.category || (plugin.isOwner ? 'Owner Menu' : plugin.isAdmin ? 'Admin Menu' : plugin.isGroup ? 'Group Menu' : 'General Menu'),
          isOwner: plugin.isOwner || false,
          isAdmin: plugin.isAdmin || false,
          isGroup: plugin.isGroup || false,
        });
        totalAliases += aliases.length;
      } catch {}
    }

    const sorted = Array.from(commands.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const p = settings.prefix;

    // ── Category filter: .menu admin ──────────────────────────────
    const filter = args[0]?.toLowerCase();
    if (filter) {
      const matchedCat = CATEGORIES.find(c => c.name.toLowerCase().includes(filter));
      const catName = matchedCat?.name || filter;

      const catCmds = sorted.filter(([, info]) => info.category.toLowerCase().includes(filter));
      if (!catCmds.length) {
        return sock.sendMessage(from, {
          text: `❌ No commands found for *"${filter}"*.\n\nTry: .menu admin, .menu group, .menu fun, .menu helper`
        }, { quoted: msg });
      }

      let txt = `╭───❖ ${matchedCat?.emoji || '📋'} ${toMono(catName)} ❖───\n`;
      catCmds.forEach(([cmd, info]) => {
        txt += `${toMono(`• ${p}${cmd}`)}`;
        if (info.aliases.length > 1) txt += toMono(` (${info.aliases.slice(1).join(', ')})`);
        txt += `\n  ${toMono(`↳ ${info.description}`)}\n`;
      });
      txt += `╰─────────────────────`;
      return sock.sendMessage(from, { text: txt }, { quoted: msg });
    }

    // ── Full list message menu ────────────────────────────────────
    const catMap = {};
    for (const [cmd, info] of sorted) {
      if (!catMap[info.category]) catMap[info.category] = [];
      catMap[info.category].push({ cmd, info });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });

    // Build WhatsApp list message sections
    const sections = CATEGORIES
      .filter(cat => catMap[cat.name]?.length)
      .map(cat => ({
        title: `${cat.emoji} ${cat.name}`,
        rows: catMap[cat.name].slice(0, 10).map(({ cmd, info }) => ({
          title: `${p}${cmd}`,
          rowId: `${p}${cmd}`,
          description: info.description.slice(0, 72)
        }))
      }));

    const headerText =
`╭─── ⋅ ∙ 🕷️ GABIMARU BOT ∙ ⋅ ───╮
│ ${toMono(`⌚ ${timeStr}  📅 ${dateStr}`)}
│ ${toMono(`📦 Plugins: ${sorted.length}  🔢 Cmds: ${totalAliases}`)}
│ ${toMono(`🔑 Prefix: [ ${p} ]`)}
│ ${toMono(`📟 Library: Baileys-pro`)}
╰─── ⋅ ∙ ˗ˏˋ 🚀 ˎˊ˗ ∙ ⋅ ───╯

📌 Tap *Open Menu* to browse commands
💡 Or use *${p}menu <category>* to filter
   _e.g. ${p}menu admin, ${p}menu fun_`;

    try {
      // Try list message first (interactive buttons)
      await sock.sendMessage(from, {
        text: headerText,
        footer: '🤖 Gabimaru · Built with Node.js & Baileys',
        title: '🕷️ Gabimaru Command Menu',
        buttonText: '📋 Open Menu',
        sections
      }, { quoted: msg });

    } catch {
      // Fallback: text menu grouped by category
      let menuText = headerText + '\n\n';

      for (const cat of CATEGORIES) {
        const cmds = catMap[cat.name];
        if (!cmds?.length) continue;
        menuText += `╭───❖ ${cat.emoji} ${toMono(cat.name)} ❖───\n`;
        cmds.forEach(({ cmd, info }) => {
          menuText += toMono(`• ${p}${cmd}`);
          if (info.aliases.length > 1) menuText += toMono(` (${info.aliases.slice(1).join(', ')})`);
          menuText += `\n  ${toMono(`↳ ${info.description}`)}\n`;
        });
        menuText += `╰${'─'.repeat(cat.name.length + 8)}╯\n\n`;
      }

      menuText += `╭───❖ ${toMono('👨‍💻 Developer')} ❖───\n`;
      menuText += `${toMono('• Ayo Kunle x Gabimaru')}\n`;
      menuText += `${toMono('• Built with Node.js & Baileys')}\n`;
      menuText += `╰─────────────────────`;

      await sock.sendMessage(from, { text: menuText }, { quoted: msg });
    }

    await react01(sock, from, msg.key, 500);
  }
};
