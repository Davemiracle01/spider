/**
 * linkgc.js — Get group invite link
 */
module.exports = {
  command: ["gclink", "grouplink", "invitelink"],
  description: "Get the invite link for the current group",
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from }) {
    try {
      const code = await sock.groupInviteCode(from);
      await sock.sendMessage(from, {
        text: `🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}`
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ Failed to get link: ${err.message}` }, { quoted: msg });
    }
  }
};
