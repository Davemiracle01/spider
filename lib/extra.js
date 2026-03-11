/**
 * lib/extra.js — Shared helpers for Gabimaru plugins
 */

/** react01: ⏳ loading emoji → ✅ done */
async function react01(sock, from, key, delayMs = 2000) {
  try {
    await sock.sendMessage(from, { react: { text: '⏳', key } });
    await new Promise(r => setTimeout(r, delayMs));
    await sock.sendMessage(from, { react: { text: '✅', key } });
  } catch {}
}

/** react02: custom first emoji → custom final emoji */
async function react02(sock, from, key, firstEmoji = '🔵', finalEmoji = '✅', delayMs = 2000) {
  try {
    await sock.sendMessage(from, { react: { text: firstEmoji, key } });
    await new Promise(r => setTimeout(r, delayMs));
    await sock.sendMessage(from, { react: { text: finalEmoji, key } });
  } catch {}
}

/** error01: ❌ error reaction */
async function error01(sock, from, key, delayMs = 500) {
  try {
    await new Promise(r => setTimeout(r, delayMs));
    await sock.sendMessage(from, { react: { text: '❌', key } });
  } catch {}
}

/** getTarget: Extract mentioned/replied-to JID from a message */
function getTarget(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo
            || msg.message?.imageMessage?.contextInfo
            || msg.message?.videoMessage?.contextInfo;
  return ctx?.mentionedJid?.[0] || ctx?.participant || null;
}

/** isAdmin: Check if a JID is an admin in group metadata */
function isAdminJid(jid, participants) {
  return participants.some(p => p.id === jid && p.admin);
}

/** formatTime: Format ms duration to "Xh Xm Xs" */
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(' ');
}

module.exports = { react01, react02, error01, getTarget, isAdminJid, formatTime };
