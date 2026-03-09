const axios = require("axios");

module.exports = {
  command: ["pinterest", "pin", "pint", "ddimg"],
  description: "Search for images on DuckDuckGo/Unsplash. Usage: .pinterest <query>",

  async run({ sock, msg, from, args, apiCache }) {
    const query = args.join(" ").trim();
    if (!query) {
      return sock.sendMessage(from, { text: "📌 Usage: .pinterest <search term>\n\nExample: .pinterest anime girl" }, { quoted: msg });
    }

    // Check cache first
    const cacheKey = `img_${query.toLowerCase().slice(0, 30)}`;
    let imgUrl = apiCache?.get(cacheKey);

    if (!imgUrl) {
      try {
        // Try DuckDuckGo first
        const { data } = await axios.get("https://api.duckduckgo.com/", {
          params: { q: query, iax: "images", ia: "images", format: "json", no_redirect: 1 },
          timeout: 5000,
        });
        const results = data?.RelatedTopics?.filter((t) => t.Icon?.URL).map((t) => t.Icon.URL) || [];
        if (results.length) imgUrl = results[Math.floor(Math.random() * results.length)];
      } catch {}

      // Fallback: Picsum with seed
      if (!imgUrl) {
        const seed = encodeURIComponent(query).replace(/%/g, "").slice(0, 10) || "anime";
        imgUrl = `https://picsum.photos/seed/${seed}/800/600`;
      }

      apiCache?.set(cacheKey, imgUrl, 120); // cache 2 mins
    }

    await sock.sendMessage(from, { image: { url: imgUrl }, caption: `🔍 *${query}*` }, { quoted: msg });
  },
};
