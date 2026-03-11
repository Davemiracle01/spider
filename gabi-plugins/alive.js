const { react01 } = require('../lib/extra');

module.exports = {
  command: ["alive", "runtime"],
  description: "Check if bot is operational.",

  async run({ sock, msg, from }) {
    const uptime = process.uptime(); // in seconds

    const format = (num) => (num < 10 ? "0" + num : num);

    let seconds = Math.floor(uptime);
    let years = Math.floor(seconds / (365 * 24 * 60 * 60));
    seconds %= 365 * 24 * 60 * 60;

    let months = Math.floor(seconds / (30 * 24 * 60 * 60));
    seconds %= 30 * 24 * 60 * 60;

    let weeks = Math.floor(seconds / (7 * 24 * 60 * 60));
    seconds %= 7 * 24 * 60 * 60;

    let days = Math.floor(seconds / (24 * 60 * 60));
    seconds %= 24 * 60 * 60;

    let hours = Math.floor(seconds / 3600);
    seconds %= 3600;

    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;

    // Build uptime string dynamically
    let parts = [];
    if (years) parts.push(`${years}y`);
    if (months) parts.push(`${months}mo`);
    if (weeks) parts.push(`${weeks}w`);
    if (days) parts.push(`${days}d`);

    // Always show time in hh:mm:ss
    parts.push(`${format(hours)}h:${format(minutes)}m:${format(seconds)}s`);

    let uptimeStr = parts.join(" ");

    await react01(sock, from, msg.key, 2000);
    await sock.sendMessage(from, {
      text: `🔱 *Gabimaru the hollow is alive.*\n\n🕐 Uptime: *${uptimeStr}*\n🌹 Developed by: *Gabimaru*`,
    }, { quoted: msg });
  }
};