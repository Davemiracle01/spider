const axios = require("axios");

const fallbackFacts = [
  "A group of flamingos is called a flamboyance.",
  "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.",
  "The Eiffel Tower can grow more than 6 inches in summer due to thermal expansion.",
  "Octopuses have three hearts and blue blood.",
  "A day on Venus is longer than a year on Venus.",
  "The human nose can detect over 1 trillion different smells.",
  "Bananas are berries, but strawberries are not.",
  "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
  "There are more possible iterations of a chess game than atoms in the observable universe.",
  "A snail can sleep for 3 years.",
  "The shortest war in history lasted 38 minutes — between Britain and Zanzibar in 1896.",
  "Hot water can freeze faster than cold water — this is known as the Mpemba effect.",
  "Wombat poop is cube-shaped.",
  "Nigeria has more English speakers than England.",
  "An ant can lift 50 times its own body weight.",
];

module.exports = {
  command: ["fact", "funfact", "did"],
  description: "Get a random interesting fact",

  async run({ sock, msg, from }) {
    let fact;
    try {
      const { data } = await axios.get("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en", { timeout: 5000 });
      fact = data?.text;
    } catch { fact = null; }

    if (!fact) {
      fact = fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
    }

    await sock.sendMessage(from, {
      text: `🧠 *Random Fact*\n\n💡 ${fact}`
    }, { quoted: msg });
  }
};
