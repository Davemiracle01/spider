const axios = require('axios');
const { react01 } = require('../lib/extra');

const ACTION_MAP = {
    nom: 'nom',
    poke: 'poke', 
    cry: 'cry',
    kiss: 'kiss',
    pat: 'pat',
    hug: 'hug',
    wink: 'wink',
    facepalm: 'facepalm',
    'face-palm': 'facepalm'
};

const ACTION_LABELS = {
    nom: 'nomming 🍽️',
    poke: 'poking 👉',
    cry: 'crying 😭',
    kiss: 'kissing 💋',
    pat: 'patting 🤗',
    hug: 'hugging 🫂',
    wink: 'winking 😉',
    facepalm: 'face-palming 🤦'
};

// nekos.best is a reliable free anime GIF API
const NEKOS_BEST_MAP = {
    nom: 'nod',
    poke: 'poke',
    cry: 'cry',
    kiss: 'kiss',
    pat: 'pat',
    hug: 'hug',
    wink: 'wink',
    facepalm: 'facepalm'
};

module.exports = {
    command: ["nom", "poke", "cry", "kiss", "pat", "hug", "wink", "facepalm"],
    description: "Get random anime GIFs for various actions",
    category: "Fun",

    async run({ sock, msg, from, commandName }) {
        await react01(sock, from, msg.key, 2000);

        const action = ACTION_MAP[commandName] || commandName;
        const label = ACTION_LABELS[action] || action;
        const nekoAction = NEKOS_BEST_MAP[action] || action;

        try {
            // Primary: nekos.best API
            const response = await axios.get(`https://nekos.best/api/v2/${nekoAction}`, { timeout: 10000 });
            const gifUrl = response.data?.results?.[0]?.url;

            if (!gifUrl) throw new Error('No GIF URL returned');

            const gifBuffer = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 15000 });

            await sock.sendMessage(from, {
                video: Buffer.from(gifBuffer.data),
                gifPlayback: true,
                caption: `> ${label}`
            }, { quoted: msg });

        } catch (err) {
            // Fallback: otakugifs.xyz
            try {
                const fallback = await axios.get(`https://api.otakugifs.xyz/gif?reaction=${nekoAction}`, { timeout: 10000 });
                const gifUrl = fallback.data?.url;
                if (!gifUrl) throw new Error('Fallback also failed');

                const gifBuffer = await axios.get(gifUrl, { responseType: 'arraybuffer', timeout: 15000 });
                await sock.sendMessage(from, {
                    video: Buffer.from(gifBuffer.data),
                    gifPlayback: true,
                    caption: `> ${label}`
                }, { quoted: msg });
            } catch (fallbackErr) {
                console.error('Animu error:', fallbackErr);
                await sock.sendMessage(from, {
                    text: `❌ Could not fetch anime GIF for *${action}*. APIs may be down, try again later.`
                }, { quoted: msg });
            }
        }
    }
};
