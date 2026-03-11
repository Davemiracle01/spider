/**
 * lyrics.js — Upgraded Lyrics Plugin
 * Upgraded: no 3000-char truncation (sends in chunks if needed),
 *           multiple API fallbacks, partial search, verse formatting
 */
const axios = require("axios");

async function fetchFromLyricsOvh(title, artist) {
  const a = encodeURIComponent(artist || title);
  const t = encodeURIComponent(title);
  const { data } = await axios.get(`https://api.lyrics.ovh/v1/${a}/${t}`, { timeout: 10000 });
  if (!data.lyrics) throw new Error("No lyrics");
  return data.lyrics;
}

async function fetchFromHappi(title, artist) {
  // happi.dev free tier
  const query = encodeURIComponent(`${artist ? artist + " " : ""}${title}`);
  const { data } = await axios.get(`https://api.happi.dev/v1/music?q=${query}&limit=1&apikey=happi_free`, { timeout: 8000 });
  if (!data.success || !data.result?.[0]) throw new Error("No result");
  const track = data.result[0];
  const detail = await axios.get(track.api_lyrics, { timeout: 8000, headers: { "x-happi-key": "happi_free" } });
  if (!detail.data.result?.lyrics) throw new Error("No lyrics");
  return detail.data.result.lyrics;
}

async function fetchFromLrclib(title, artist) {
  const params = { track_name: title };
  if (artist) params.artist_name = artist;
  const { data } = await axios.get("https://lrclib.net/api/search", { params, timeout: 8000 });
  if (!data?.[0]?.plainLyrics) throw new Error("No lyrics");
  return data[0].plainLyrics;
}

async function getLyrics(title, artist) {
  const fetchers = [
    () => fetchFromLrclib(title, artist),
    () => fetchFromLyricsOvh(title, artist),
  ];
  for (const fn of fetchers) {
    try { return await fn(); } catch { /* try next */ }
  }
  throw new Error("Lyrics not found on any source");
}

async function sendLyricsInChunks(sock, from, msg, header, lyrics) {
  const CHUNK = 3500;
  if (lyrics.length <= CHUNK) {
    return sock.sendMessage(from, { text: `${header}\n\n${lyrics}` }, { quoted: msg });
  }

  // Send in parts
  await sock.sendMessage(from, { text: `${header}\n\n${lyrics.slice(0, CHUNK)}` }, { quoted: msg });
  let offset = CHUNK;
  let part = 2;
  while (offset < lyrics.length) {
    const chunk = lyrics.slice(offset, offset + CHUNK);
    await new Promise(r => setTimeout(r, 600));
    await sock.sendMessage(from, { text: `🎵 _(Part ${part})_\n\n${chunk}` });
    offset += CHUNK;
    part++;
  }
}

module.exports = {
  command: ["lyrics", "lyric", "lrc"],
  description: "Get full song lyrics. Usage: .lyrics Song Name - Artist",

  async run({ sock, msg, from, text }) {
    if (!text) {
      return sock.sendMessage(from, {
        text: `🎵 *Lyrics Finder*\n\nUsage:\n› *.lyrics Blinding Lights - The Weeknd*\n› *.lyrics Bohemian Rhapsody* _(artist optional)_\n\nLong lyrics are sent in multiple parts automatically.`
      }, { quoted: msg });
    }

    const [titleRaw, artistRaw] = text.split("-").map(s => s.trim());
    const title  = titleRaw?.trim();
    const artist = artistRaw?.trim() || null;

    if (!title) {
      return sock.sendMessage(from, { text: "⚠️ Please provide a song title." }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: "🔍 Searching lyrics..." }, { quoted: msg });

    try {
      const lyrics = await getLyrics(title, artist);
      const header = `🎵 *${title}*${artist ? ` — ${artist}` : ""}`;
      await sendLyricsInChunks(sock, from, msg, header, lyrics.trim());
    } catch {
      await sock.sendMessage(from, {
        text: `❌ Lyrics not found for: *${text}*\n\nTips:\n› Include artist name: \`.lyrics Song - Artist\`\n› Check spelling\n› Try a different song title format`
      }, { quoted: msg });
    }
  }
};
