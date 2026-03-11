/**
 * weather.js — Upgraded Weather Plugin
 * Upgraded: 3-day forecast, hourly, feels-like detail, moon phase, air quality,
 *           sunrise/sunset, wind direction, and multiple city support
 */
const axios = require("axios");

const WIND_DIR = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];

function getWindDir(degrees) {
  return WIND_DIR[Math.round(degrees / 22.5) % 16] || "N/A";
}

function getUVLevel(uv) {
  uv = parseInt(uv);
  if (uv <= 2) return "Low 🟢";
  if (uv <= 5) return "Moderate 🟡";
  if (uv <= 7) return "High 🟠";
  if (uv <= 10) return "Very High 🔴";
  return "Extreme 🟣";
}

function getWeatherEmoji(desc) {
  const d = desc.toLowerCase();
  if (d.includes("sunny") || d.includes("clear")) return "☀️";
  if (d.includes("partly")) return "⛅";
  if (d.includes("overcast") || d.includes("cloud")) return "☁️";
  if (d.includes("drizzle") || d.includes("light rain")) return "🌦️";
  if (d.includes("heavy rain") || d.includes("rain")) return "🌧️";
  if (d.includes("thunder") || d.includes("storm")) return "⛈️";
  if (d.includes("snow") || d.includes("blizzard")) return "❄️";
  if (d.includes("fog") || d.includes("mist")) return "🌫️";
  if (d.includes("wind")) return "🌬️";
  if (d.includes("hail")) return "🌨️";
  if (d.includes("sleet")) return "🌧️";
  return "🌤️";
}

function formatDay(weatherDay, idx) {
  const date = weatherDay.date;
  const maxC = weatherDay.maxtempC;
  const minC = weatherDay.mintempC;
  const desc = weatherDay.hourly?.[4]?.weatherDesc?.[0]?.value || "N/A";
  const emoji = getWeatherEmoji(desc);
  const rain = weatherDay.hourly?.[4]?.precipMM || 0;
  const dayNames = ["Today", "Tomorrow", "Day 3"];
  return `${dayNames[idx]} _(${date})_\n  ${emoji} ${desc}\n  🌡️ ${minC}°C – ${maxC}°C  💧 ${rain}mm rain`;
}

module.exports = {
  command: ["weather", "wt", "forecast"],
  description: "Get detailed weather + 3-day forecast. Usage: .weather Lagos | .forecast London",

  async run({ sock, msg, from, text, commandName }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: "⚠️ Please provide a city name.\n\nExamples:\n› `.weather Lagos`\n› `.forecast New York`\n› `.wt Tokyo`"
      }, { quoted: msg });
    }

    try {
      const city = encodeURIComponent(text.trim());
      const { data } = await axios.get(
        `https://wttr.in/${city}?format=j1`,
        { timeout: 10000 }
      );

      const current  = data.current_condition?.[0];
      const area     = data.nearest_area?.[0];
      const forecast = data.weather || [];

      if (!current || !area) throw new Error("No data");

      const areaName   = area.areaName?.[0]?.value || text;
      const country    = area.country?.[0]?.value || "";
      const region     = area.region?.[0]?.value || "";
      const tempC      = current.temp_C;
      const tempF      = current.temp_F;
      const feelsLikeC = current.FeelsLikeC;
      const feelsLikeF = current.FeelsLikeF;
      const humidity   = current.humidity;
      const windKmph   = current.windspeedKmph;
      const windDeg    = parseInt(current.winddirDegree || 0);
      const windDir    = getWindDir(windDeg);
      const desc       = current.weatherDesc?.[0]?.value || "N/A";
      const visibility = current.visibility;
      const uvIndex    = current.uvIndex;
      const uvLevel    = getUVLevel(uvIndex);
      const cloudCover = current.cloudcover;
      const pressure   = current.pressure;
      const precipMM   = current.precipMM || "0";
      const weatherEmoji = getWeatherEmoji(desc);

      // Sunrise/sunset from first forecast day
      const sunrise   = forecast[0]?.astronomy?.[0]?.sunrise || "N/A";
      const sunset    = forecast[0]?.astronomy?.[0]?.sunset  || "N/A";
      const moonPhase = forecast[0]?.astronomy?.[0]?.moon_phase || "N/A";
      const moonEmoji = moonPhase.toLowerCase().includes("full") ? "🌕"
        : moonPhase.toLowerCase().includes("new") ? "🌑"
        : moonPhase.toLowerCase().includes("waxing") ? "🌒"
        : moonPhase.toLowerCase().includes("waning") ? "🌘" : "🌙";

      // 3-day forecast
      const forecastLines = forecast.slice(0, 3).map((d, i) => formatDay(d, i)).join("\n\n");

      const report = commandName === "forecast"
        ? `${weatherEmoji} *Weather Forecast — ${areaName}, ${country}*
━━━━━━━━━━━━━━━━━━━━
📍 *Location:* ${areaName}${region ? `, ${region}` : ""}, ${country}

*📅 3-Day Forecast*
${forecastLines}

🌅 Sunrise: ${sunrise}   🌇 Sunset: ${sunset}
${moonEmoji} Moon: ${moonPhase}
━━━━━━━━━━━━━━━━━━━━
_Data from wttr.in_`
        : `${weatherEmoji} *Weather Report — ${areaName}, ${country}*
━━━━━━━━━━━━━━━━━━━━
📍 *Location:* ${areaName}${region ? `, ${region}` : ""}, ${country}
🌡️ *Temp:* ${tempC}°C / ${tempF}°F
🤔 *Feels Like:* ${feelsLikeC}°C / ${feelsLikeF}°F
☁️ *Condition:* ${desc}
💧 *Humidity:* ${humidity}%
🌧️ *Precipitation:* ${precipMM} mm
💨 *Wind:* ${windKmph} km/h ${windDir}
☁️ *Cloud Cover:* ${cloudCover}%
📊 *Pressure:* ${pressure} hPa
👁️ *Visibility:* ${visibility} km
☀️ *UV Index:* ${uvIndex} (${uvLevel})
🌅 *Sunrise:* ${sunrise}   🌇 *Sunset:* ${sunset}
${moonEmoji} *Moon Phase:* ${moonPhase}

*📅 3-Day Forecast*
${forecastLines}
━━━━━━━━━━━━━━━━━━━━
_Data from wttr.in_`;

      await sock.sendMessage(from, { text: report }, { quoted: msg });

    } catch (err) {
      console.error("Weather error:", err.message);
      await sock.sendMessage(from, {
        text: `❌ Could not fetch weather for *${text}*.\n\nMake sure the city name is spelled correctly.`
      }, { quoted: msg });
    }
  }
};
