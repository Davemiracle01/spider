const axios = require("axios");

module.exports = {
  command: ["weather", "wt"],
  description: "Get current weather for a city. Usage: .weather Lagos",

  async run({ sock, msg, from, text }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: "⚠️ Please provide a city name.\n\nExample: `.weather Lagos`"
      }, { quoted: msg });
    }

    try {
      const city = encodeURIComponent(text.trim());
      const { data } = await axios.get(
        `https://wttr.in/${city}?format=j1`,
        { timeout: 8000 }
      );

      const current = data.current_condition?.[0];
      const area = data.nearest_area?.[0];

      if (!current || !area) throw new Error("No data");

      const areaName = area.areaName?.[0]?.value || text;
      const country = area.country?.[0]?.value || "";
      const tempC = current.temp_C;
      const tempF = current.temp_F;
      const feelsLike = current.FeelsLikeC;
      const humidity = current.humidity;
      const windKmph = current.windspeedKmph;
      const desc = current.weatherDesc?.[0]?.value || "N/A";
      const visibility = current.visibility;
      const uvIndex = current.uvIndex;

      const weatherEmoji = getWeatherEmoji(desc);

      await sock.sendMessage(from, {
        text:
`${weatherEmoji} *Weather Report*
━━━━━━━━━━━━━━━━━━
📍 *Location:* ${areaName}, ${country}
🌡️ *Temp:* ${tempC}°C / ${tempF}°F
🤔 *Feels Like:* ${feelsLike}°C
☁️ *Condition:* ${desc}
💧 *Humidity:* ${humidity}%
💨 *Wind:* ${windKmph} km/h
👁️ *Visibility:* ${visibility} km
☀️ *UV Index:* ${uvIndex}
━━━━━━━━━━━━━━━━━━
_Powered by wttr.in_`
      }, { quoted: msg });

    } catch (err) {
      console.error("Weather error:", err.message);
      await sock.sendMessage(from, {
        text: `❌ Could not fetch weather for *${text}*. Check the city name and try again.`
      }, { quoted: msg });
    }
  }
};

function getWeatherEmoji(desc) {
  const d = desc.toLowerCase();
  if (d.includes("sunny") || d.includes("clear")) return "☀️";
  if (d.includes("cloud")) return "☁️";
  if (d.includes("rain") || d.includes("drizzle")) return "🌧️";
  if (d.includes("thunder") || d.includes("storm")) return "⛈️";
  if (d.includes("snow") || d.includes("blizzard")) return "❄️";
  if (d.includes("fog") || d.includes("mist")) return "🌫️";
  if (d.includes("wind")) return "🌬️";
  if (d.includes("hail")) return "🌨️";
  return "🌤️";
}
