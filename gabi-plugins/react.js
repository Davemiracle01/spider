const axios = require('axios');
const { react01 } = require('../lib/extra');

module.exports = {
    command: ['react', 'autolike'],
    description: 'Send reactions to WhatsApp channel messages using TMK Autolike API',
    category: 'Utility',
    usage: '.react <channel_link> <emoji>',

    run: async ({ sock, msg, from, args }) => {
        try {
            await react01(sock, from, msg.key, 2000);

            if (args.length < 1) {
                return sock.sendMessage(from, {
                    text: `❌ *Usage:* .react <channel_link> <emoji>\n📌 *Example:* .react https://whatsapp.com/channel/0029VbB3x7IIyPtU0Sa3163f/124 ❤️`
                }, { quoted: msg });
            }

            const channelLink = args[0];
            const emoji = args[1] || '❤️';

            if (!channelLink.includes('whatsapp.com/channel/') && !channelLink.includes('channel.whatsapp.com')) {
                return sock.sendMessage(from, {
                    text: `❌ *Invalid Link!*\n\nProvide a valid WhatsApp channel link.\n📌 Format: https://whatsapp.com/channel/CHANNEL_ID/MESSAGE_ID`
                }, { quoted: msg });
            }

            const processedLink = channelLink.includes('channel.whatsapp.com')
                ? `https://whatsapp.com/channel/${channelLink.split('channel.whatsapp.com/')[1]}`
                : channelLink;

            const processingMsg = await sock.sendMessage(from, {
                text: `⏳ *Processing Reaction...*\n\n🔗 Link: ${processedLink}\n🎯 Emoji: ${emoji}\n\n⚡ Contacting TMK Autolike Server...`
            }, { quoted: msg });

            const apiUrl = `https://ayokunle-restapi-8ma5.onrender.com/react?channelmsglink=${encodeURIComponent(processedLink)}&emoji=${encodeURIComponent(emoji)}&secret=TMKRULEZBROO`;

            const response = await axios.get(apiUrl, { timeout: 30000 });
            const dataa = response.data;

            await sock.sendMessage(from, { delete: processingMsg.key });

            if (dataa?.data?.success) {
                await sock.sendMessage(from, {
                    text: `✅ *TMK Autolike Successful!*\n\n• Reactions: ${dataa.data.totalSessions}\n• Emoji: ${emoji}\n\n⚡ *Powered by TMK WA TEAM*`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    text: `❌ *Autolike Failed!*\n\n📛 ${dataa?.message || 'Unknown error'}`
                }, { quoted: msg });
            }

        } catch (error) {
            console.error('React Plugin Error:', error);
            await sock.sendMessage(from, {
                text: `❌ *API Connection Failed!*\n\n📛 ${error.message}\n\n⚠️ Try again later.`
            }, { quoted: msg });
        }
    }
};
