const { react01, error01 } = require('../lib/extra');

module.exports = {
  command: ['mute', 'unmute', 'lock', 'unlock'],
  description: 'Mute or unmute the group (lock/unlock messaging)',
  category: 'Admin Menu',
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, commandName }) {
    const isMute = ['mute', 'lock'].includes(commandName);
    try {
      await react01(sock, from, msg.key, 1500);
      await sock.groupSettingUpdate(from, isMute ? 'announcement' : 'not_announcement');
      await sock.sendMessage(from, {
        text: isMute
          ? `🔇 *Group Locked!*\n\nOnly admins can send messages now.\n\n💡 Use *.unmute* to unlock.`
          : `🔊 *Group Unlocked!*\n\nAll members can now send messages.`
      }, { quoted: msg });
    } catch (err) {
      await error01(sock, from, msg.key);
      await sock.sendMessage(from, { text: '❌ Failed to update group settings. Check my admin rights.' }, { quoted: msg });
    }
  }
};
