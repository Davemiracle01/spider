const { react01 } = require('../lib/extra');
const repsond = async (word) => {
      await sock.sendMessage(from, { text: word }, { quoted: msg })
    }
module.exports = {
  command: ["leave", "exit", "leavegc"],
  description: "",
  isGroup: true,
  isSudo: true,
      
  async run({ sock, respond, msg, from }) {
  await react01(sock, from, msg.key, 2000);
    
//    await sock.sendMessage(from, { text: "Gabimaru will make is exit.\nThis Domain is of no interest to me"});
    await sock.groupLeave(from)
  }
}