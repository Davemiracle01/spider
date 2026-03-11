const { react01 } = require('../lib/extra');

module.exports = {
    command: ['ping', 'restime', 'speed'],
    description: 'Check bot response time',
    category: 'General',

    async run({ sock, msg, from }) {
        await react01(sock, from, msg.key, 1000);
        const start = Date.now();
        await sock.sendMessage(from, {
            text: `🏓 *Pong!*\n⚡ Response time: *${Date.now() - start}ms*\n✅ Bot is online and running.`
        }, { quoted: msg });
    }
};
