const activeSessions = new Map();

function addSession(number, session) {
  activeSessions.set(number, { session, connected: true, lastActivity: Date.now() });
}

function removeSession(number) {
  activeSessions.delete(number);
}

function updateSessionStatus(number, connected) {
  const data = activeSessions.get(number);
  if (data) { data.connected = connected; data.lastActivity = Date.now(); }
}

function getAllSessions() {
  const valid = [];
  for (const [number, data] of activeSessions.entries()) {
    if (data.connected) valid.push([number, data.session]);
  }
  return valid;
}

function getSessionCount() { return getAllSessions().length; }

function getSessionByNumber(number) {
  const data = activeSessions.get(number);
  return data && data.connected ? data.session : null;
}

setInterval(() => {
  const now = Date.now();
  for (const [number, data] of activeSessions.entries()) {
    if (!data.connected && (now - data.lastActivity) > 300000) activeSessions.delete(number);
  }
}, 60000);

module.exports = { addSession, removeSession, updateSessionStatus, getAllSessions, getSessionCount, getSessionByNumber };
