/**
 * chatbot.js — Chatbot toggle manager
 * Uses in-memory Set as primary cache, syncs to disk for persistence.
 */
const fs   = require("fs");
const path = require("path");

const modePath = path.join(__dirname, "mode.json");

// Load disabled chats into memory at startup (fast in-memory lookups)
let disabledChats = new Set();
try {
  if (fs.existsSync(modePath)) {
    const list = JSON.parse(fs.readFileSync(modePath, "utf8"));
    if (Array.isArray(list)) disabledChats = new Set(list);
  }
} catch {}

function isChatbotDisabled(chatId) {
  return disabledChats.has(chatId);
}

function toggleChatbot(chatId) {
  if (disabledChats.has(chatId)) {
    disabledChats.delete(chatId); // re-enable
  } else {
    disabledChats.add(chatId);    // disable
  }
  // Persist to disk asynchronously (non-blocking)
  fs.writeFile(modePath, JSON.stringify([...disabledChats], null, 2), () => {});
  return !disabledChats.has(chatId); // true = now enabled
}

module.exports = { isChatbotDisabled, toggleChatbot };
