/**
 * ai.js — Upgraded AI Chat with Claude / Groq / Fallback
 * Improvements: conversation context, better formatting, typing indicator, model info
 */
const axios = require('axios');
const { react01, error01 } = require('../lib/extra');

// Simple in-memory context per user (last 3 exchanges)
const context = {};

module.exports = {
  command: ['ai', 'ask', 'gai', 'chat'],
  description: 'Chat with Gabimaru AI (powered by Groq/LLaMA)',
  category: 'Helper Menu',

  async run({ sock, msg, from, text, sender, commandName, settings }) {
    if (!text?.trim()) {
      return sock.sendMessage(from, {
        text: `🤖 *Gabimaru AI*\n\n❓ Please provide a question or message!\n\n*Examples:*\n› ${settings.prefix}ai What is the capital of Kenya?\n› ${settings.prefix}ai Write a WhatsApp group welcome message\n› ${settings.prefix}ai Tell me a fun fact\n\n💡 Use *${settings.prefix}clearchat* to reset conversation memory.`
      }, { quoted: msg });
    }

    await react01(sock, from, msg.key, 500);
    await sock.sendPresenceUpdate('composing', from);

    const userId = sender || from;
    if (!context[userId]) context[userId] = [];

    // Keep last 3 exchanges (6 messages) for context
    const history = context[userId].slice(-6);

    const systemPrompt = `You are Gabimaru, a smart and friendly WhatsApp bot assistant. 
You are helpful, concise, and conversational. Keep responses clear and well-formatted for WhatsApp.
Use *bold* for important info. Keep answers under 300 words unless asked for more.
You are knowledgeable, witty, and supportive. Never refuse reasonable questions.`;

    const groqKey = process.env.GROQ_API_KEY;
    let answer = null;
    let model = 'Unknown';

    try {
      if (groqKey) {
        const messages = [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: text }
        ];

        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: 'llama3-70b-8192',
          messages,
          max_tokens: 700,
          temperature: 0.7
        }, {
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          timeout: 25000
        });

        answer = res.data.choices?.[0]?.message?.content?.trim();
        model = 'LLaMA 3 70B (Groq)';

        if (answer) {
          // Save to context
          context[userId].push({ role: 'user', content: text });
          context[userId].push({ role: 'assistant', content: answer });
          if (context[userId].length > 10) context[userId] = context[userId].slice(-10);
        }
      }

      if (!answer) {
        // Fallback API
        const encoded = encodeURIComponent(text);
        const response = await axios.get(
          `https://ayokunle-restapi-8ma5.onrender.com/chatbot?ask=${encoded}`,
          { timeout: 15000 }
        );
        const data = response.data;
        if (data.status === 'success') {
          answer = data.reply;
          model = `Fallback (${data.answer_time?.toFixed(1)}s)`;
        }
      }

      if (!answer) throw new Error('No answer received from any provider');

      const hasContext = context[userId]?.length > 2;
      await sock.sendMessage(from, {
        text:
`🤖 *Gabimaru AI*

💬 *Q:* ${text}

💡 *A:* ${answer}

─────────────────
_🧠 ${model}${hasContext ? ' · 💾 Context active' : ''}_`
      }, { quoted: msg });

    } catch (error) {
      console.error('AI Plugin Error:', error);
      await error01(sock, from, msg.key);

      let errMsg = '❌ *AI Unavailable*\n\n';
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errMsg += '⏱️ Request timed out. Please try again.';
      } else if (error.response?.status === 429) {
        errMsg += '🚦 Rate limit hit. Wait a moment and try again.';
      } else if (error.response?.status >= 500) {
        errMsg += '🔧 AI server error. Try again in a few seconds.';
      } else {
        errMsg += '⚠️ Something went wrong. Please try again shortly.';
      }

      await sock.sendMessage(from, { text: errMsg }, { quoted: msg });
    }
  }
};
