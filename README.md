# 🕷️ Gabimaru WhatsApp Bot — Spider-Venom Symbiote Edition v4.0

> Heroku-optimized | Public mode | Multi-session | 70+ commands

---

## 🚀 Deploy to Heroku

### Step 1: Create Heroku App
```bash
heroku create your-app-name
```

### Step 2: Set Environment Variables
```bash
heroku config:set APP_URL=https://your-app-name.herokuapp.com
heroku config:set GROQ_API_KEY=your_groq_key_here   # optional, for AI chat
heroku config:set TZ=Africa/Nairobi
heroku config:set SESSION_SECRET=some_long_random_string
```

### Step 3: Deploy
```bash
git add .
git commit -m "Deploy Gabimaru Bot"
git push heroku main
```

### Step 4: Open Dashboard
```
https://your-app-name.herokuapp.com
```
Register an account, then pair your WhatsApp number.

---

## ♻️ Prevent Heroku Dyno Sleep (FREE tier)

Use **UptimeRobot** (free) to ping your app every 5 minutes:
1. Go to https://uptimerobot.com → Add Monitor
2. URL: `https://your-app-name.herokuapp.com/health`
3. Interval: 5 minutes

The bot also self-pings every 14 minutes via `.keepalive` if `APP_URL` is set.

---

## 📱 Session Persistence on Heroku

> ⚠️ Heroku ephemeral filesystem resets on dyno restart. Sessions are stored in `richstore/pairing/`.

To keep sessions across restarts, use one of:
- **Heroku Postgres + custom adapter** (advanced)
- **GitHub Actions** to auto-commit session files (recommended for free tier)
- **Heroku paid dynos** with attached storage

For testing, sessions survive **normal operation** but reset if the dyno is restarted from cold or scaled.

---

## 🔑 Bot Owners / Devs

Owners: `254769279076`, `254799073744`

These numbers have full access to all commands including restricted ones.

---

## 📋 Commands

### 🕷️ Core
| Command | Description |
|---------|-------------|
| `.menu` / `.help` | Show all commands |
| `.alive` / `.ping` | Check bot status |
| `.addsudo @user` | Add sudo user (owner) |
| `.delsudo @user` | Remove sudo user (owner) |
| `.listsudo` | List all sudo users |
| `.chatid` | Get current chat JID |
| `.bugreport <msg>` | Send bug report to owners |
| `.public` | Set bot to public mode |
| `.self` | Set bot to self mode |
| `.ghost on/off` | Toggle ghost mode |

### 🛡️ Group Management
| Command | Description |
|---------|-------------|
| `.kick @user` | Kick a member |
| `.kickall` | Kick all non-admins (owner only) |
| `.promote @user` | Make admin |
| `.demote @user` | Remove admin |
| `.mute` | Lock group (admin only) |
| `.unmute` | Unlock group |
| `.tagall` / `.hidetag` | Tag all members |
| `.groupinfo` | Show group info |
| `.gclink` | Get invite link |
| `.welcome on/off` | Toggle welcome messages |
| `.bye on/off` | Toggle bye messages |
| `.setname <name>` | Change group name |
| `.setdesc <text>` | Change group description |
| `.antilink on/off` | Auto-kick link senders |
| `.antidelete on/off` | Resend deleted messages |
| `.antispam on/off` | Warn spammers |
| `.bancmd @user` | Ban from using commands |
| `.warn @user` | Warn a member |
| `.lock` / `.unlock` | Lock/unlock group settings |
| `.leave` | Bot leaves the group |

### 🎮 Fun
| Command | Description |
|---------|-------------|
| `.8ball <question>` | Magic 8-ball |
| `.quote` / `.aq` | Random anime quote |
| `.joke` / `.lol` | Random joke |
| `.fact` | Random fact |
| `.flip` | Coin flip |
| `.roast @user` | Roast someone |
| `.ship @u1 @u2` | Compatibility meter |
| `.truth` / `.dare` / `.tod` | Truth or dare |
| `.wasted @user` | Apply wasted effect |

### 🌐 Utilities
| Command | Description |
|---------|-------------|
| `.weather <city>` | Current weather |
| `.tr <lang> <text>` | Translate text |
| `.calc <expression>` | Calculator |
| `.lyrics <song> - <artist>` | Get song lyrics |
| `.animechar <name>` | Anime character info |
| `.bible <book:chapter:verse>` | Bible verse |
| `.waifu` | Random waifu image |
| `.sticker` | Image to sticker |
| `.telestick <t.me link>` | Telegram sticker pack |
| `.poll Q|A|B|C` | Create a poll |
| `.translate` | Text translation |

### 💀 Owner/Dev Only
| Command | Description |
|---------|-------------|
| `.broadcast <msg>` | Send to all groups |
| `.keepalive` | Manage anti-sleep ping |
| `.hijack <groupJid>` | Get group invite link |
| `.ddos <n> <msg>` | Rapid message send |
| `.ddos2 <n>` | Rapid sticker send |
| `.setbotname <n>` | Change bot name |
| `.rvo` | Reveal view-once messages |
| `.viewstatus on/off` | Auto-view statuses |

---

## 🐛 Bug Reports

Users can report bugs with `.bugreport <description>` and the message goes directly to owner numbers.

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_URL` | Recommended | Heroku app URL for keepalive pings |
| `GROQ_API_KEY` | Optional | AI chatbot (free at groq.com) |
| `TELEGRAM_BOT_TOKEN` | Optional | For .telesticker command |
| `SESSION_SECRET` | Optional | Web dashboard security |
| `TZ` | Optional | Timezone (default: Africa/Nairobi) |

---

*Built with ❤️ by Gabimaru | Powered by @whiskeysockets/baileys*
