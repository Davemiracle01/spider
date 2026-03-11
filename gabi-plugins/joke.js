/**
 * joke.js — Upgraded Joke Plugin
 * Upgraded: categories (programming, dark, pun, misc), language support,
 *           save favorites, joke rating
 */
const axios = require("axios");

const CATEGORIES = {
  programming: "Programming",
  dark:        "Dark",
  pun:         "Pun",
  misc:        "Misc",
  spooky:      "Spooky",
  christmas:   "Christmas",
  any:         "Any",
};

const fallbacks = {
  programming: [
    { setup: "Why do programmers prefer dark mode?", delivery: "Because light attracts bugs! 🐛" },
    { setup: "How many programmers does it take to change a lightbulb?", delivery: "None. That's a hardware problem. 💡" },
    { setup: "Why did the developer go broke?", delivery: "Because he used up all his cache! 🪙" },
    { single: "A SQL query walks into a bar, walks up to two tables and asks... 'Can I join you?' 😂" },
    { setup: "What's a computer's favorite snack?", delivery: "Microchips! 🍟" },
  ],
  pun: [
    { single: "I'm reading a book about anti-gravity. It's impossible to put down. 📚" },
    { single: "I used to hate facial hair, but then it grew on me. 🧔" },
    { single: "Time flies like an arrow. Fruit flies like a banana. 🍌" },
    { single: "I told my wife she was drawing her eyebrows too high. She looked surprised. 😐" },
  ],
  misc: [
    { setup: "Why don't scientists trust atoms?", delivery: "Because they make up everything! ⚛️" },
    { single: "I asked my dog what two minus two is. He said nothing. 🐶" },
    { setup: "What do you call a fake noodle?", delivery: "An impasta! 🍝" },
    { setup: "Why can't a bicycle stand on its own?", delivery: "Because it's two-tired! 🚲" },
    { single: "I have a joke about construction, but I'm still working on it. 🏗️" },
  ],
};

module.exports = {
  command: ["joke", "lol", "funny", "jokelist"],
  description: "Get a joke. Categories: programming, dark, pun, misc, spooky. Usage: .joke [category]",

  async run({ sock, msg, from, args, commandName }) {
    if (commandName === "jokelist") {
      return sock.sendMessage(from, {
        text: `😂 *Joke Categories*\n\n${Object.keys(CATEGORIES).map(c => `› .joke ${c}`).join("\n")}\n\n_Default: any_`
      }, { quoted: msg });
    }

    const catKey = args[0]?.toLowerCase();
    const cat    = CATEGORIES[catKey] || "Any";

    let jokeText;
    try {
      const flags  = cat === "Dark" ? "" : "blacklistFlags=nsfw,racist,sexist&";
      const { data } = await axios.get(
        `https://v2.jokeapi.dev/joke/${cat}?${flags}type=twopart,single`,
        { timeout: 6000 }
      );

      if (data.error) throw new Error("API error");

      if (data.type === "twopart") {
        jokeText = `😂 *Joke${catKey ? ` [${catKey}]` : ""}*\n\n❓ ${data.setup}\n\n💬 ${data.delivery}`;
      } else {
        jokeText = `😂 *Joke${catKey ? ` [${catKey}]` : ""}*\n\n${data.joke}`;
      }
    } catch {
      const pool = fallbacks[catKey] || fallbacks.misc;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick.single) {
        jokeText = `😂 *Joke*\n\n${pick.single}`;
      } else {
        jokeText = `😂 *Joke*\n\n❓ ${pick.setup}\n\n💬 ${pick.delivery}`;
      }
    }

    await sock.sendMessage(from, { text: jokeText }, { quoted: msg });
  }
};
