const { react01 } = require('../lib/extra');

module.exports = {
    command: ['say', 'tts', 'repeat'],
    description: 'Convert text to speech (voice note)',
    category: 'Fun',

    run: async ({ sock, msg, from, text, settings }) => {
        await react01(sock, from, msg.key, 2000);

        if (!text) {
            return sock.sendMessage(from, {
                text: `⚠️ Please provide text.\nUsage: ${settings.prefix}tts Hello world`
            }, { quoted: msg });
        }

        try {
            // Build Google TTS URL directly (no package needed)
            const encoded = encodeURIComponent(text.slice(0, 200)); // Google TTS limit
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=en&client=tw-ob`;

            await sock.sendMessage(from, {
                audio: { url: ttsUrl },
                mimetype: 'audio/mp4',
                ptt: true,
                fileName: 'tts.mp3'
            }, { quoted: msg });

        } catch (err) {
            console.error('TTS error:', err);
            await sock.sendMessage(from, {
                text: '❌ Text-to-speech failed. Try again later.'
            }, { quoted: msg });
        }
    }
};
