const axios = require('axios');
const { react01 } = require('../lib/extra');

module.exports = {
    command: ['status', 'sesnumber'],
    description: 'Check status of TMK session system',
    category: 'Utility',

    run: async ({ sock, msg, from }) => {
        try {
            await react01(sock, from, msg.key, 2000);

            const processingMsg = await sock.sendMessage(from, {
                text: `⏳ *Checking TMK Session Status...*\n\n⚡ Contacting server...`
            }, { quoted: msg });

            const response = await axios.get(`https://ayokunle-restapi-8ma5.onrender.com/ses-status?secret=TMKRULEZBROO`, { timeout: 15000 });
            const data = response.data;

            await sock.sendMessage(from, { delete: processingMsg.key });

            if (data.success) {
                let statusText = `📊 *TMK Web Status*\n\n`;
                statusText += `• Active Sessions: ${data.totalSessions}\n`;
                statusText += `• System: ✅ Operational\n\n`;

                if (data.totalSessions > 0) {
                    statusText += `📱 *Active Numbers:*\n`;
                    data.sessions.slice(0, 10).forEach(s => { statusText += `• ${s.number}\n`; });
                    if (data.totalSessions > 10) statusText += `• ...and ${data.totalSessions - 10} more\n`;
                }

                statusText += `\n⚡ *Powered by TMK Team*`;
                await sock.sendMessage(from, { text: statusText }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { text: `❌ *Status Check Failed!*\n\n📛 ${data.message}` }, { quoted: msg });
            }

        } catch (error) {
            console.error('Status Plugin Error:', error);
            await sock.sendMessage(from, { text: `❌ *Cannot Reach Server!*\n\n📛 ${error.message}` }, { quoted: msg });
        }
    }
};
