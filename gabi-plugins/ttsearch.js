const axios = require('axios');
const { react01 } = require('../lib/extra');

module.exports = {
    command: ['tiktoksearch', 'ttsearch'],
    description: 'Search and download a TikTok video by keyword',
    category: 'Download',

    run: async ({ sock, msg, from, text, settings }) => {
        await react01(sock, from, msg.key, 2000);

        if (!text) {
            return sock.sendMessage(from, {
                text: `⚠️ Please provide a search term.\nUsage: ${settings.prefix}ttsearch Naruto`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(from, {
                text: `🔍 Searching TikTok for: *${text}*...`
            }, { quoted: msg });

            // Search via tikwm
            const searchRes = await axios.get(`https://tikwm.com/api/feed/search`, {
                params: { keywords: text, count: 1, cursor: 0 },
                timeout: 20000
            });

            const videos = searchRes.data?.data?.videos;
            if (!videos || videos.length === 0) {
                return sock.sendMessage(from, {
                    text: '❌ No TikTok videos found for that search.'
                }, { quoted: msg });
            }

            const video = videos[0];
            const videoUrl = video.play; // no-watermark

            const caption = `🎵 *${video.title || 'TikTok Video'}*\n` +
                `👤 *${video.author?.nickname || 'Unknown'}*\n` +
                `❤️ ${video.digg_count?.toLocaleString() || '0'} likes\n` +
                `> Gabimaru Bot`;

            const videoData = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000 });

            await sock.sendMessage(from, {
                video: Buffer.from(videoData.data),
                caption: caption,
                gifPlayback: false
            }, { quoted: msg });

        } catch (err) {
            console.error('TikTok Search error:', err);
            await sock.sendMessage(from, {
                text: '❌ Failed to search/download TikTok video. Try again later.'
            }, { quoted: msg });
        }
    }
};
