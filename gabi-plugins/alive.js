module.exports = {
  command: ["alive", "ping"],
  description: "Check if Rias is operational.",

  async run({ sock, msg, from }) {
    const uptime = process.uptime();
    const format = (s) => (s < 10 ? "0" + s : s);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const time = `${format(h)}:${format(m)}:${format(s)}`;

    await sock.sendMessage(from, {
      text: `🔱 *Gabimaru the hollow is alive.*\n\n🕐 Uptime: *${time}*\n🌹 Developed by: *Gabimaru*`,
    }, { quoted: msg });
  }
};