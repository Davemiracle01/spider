module.exports = {
  command: ["roast", "insult"],
  description: "Roast a user (all in good fun). Usage: .roast @user",

  async run({ sock, msg, from }) {
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = quotedInfo?.mentionedJid || [];
    const target = mentioned[0] || quotedInfo?.participant;

    if (!target) {
      return sock.sendMessage(from, {
        text: "❌ Mention someone to roast!\n\nExample: `.roast @user`"
      }, { quoted: msg });
    }

    const roasts = [
      "You're the human equivalent of a participation trophy.",
      "You have something on your chin... no, the third one.",
      "I'd roast you properly but my mom said I'm not allowed to burn trash.",
      "You're proof that even evolution makes mistakes.",
      "Some day you'll go far — and I hope you stay there.",
      "I'd agree with you but then we'd both be wrong.",
      "If laughter is the best medicine, your face must be curing diseases worldwide.",
      "You're a person of rare intelligence. It really is rare.",
      "You're not stupid, you just have bad luck thinking.",
      "I've seen better heads on a pimple.",
      "You have the energy of a Microsoft Terms & Conditions agreement — long, exhausting, and nobody asked for you.",
      "You bring everyone together. People who hate you most find common ground.",
      "Your wifi password is probably your own name because nobody would ever guess it.",
    ];

    const roast = roasts[Math.floor(Math.random() * roasts.length)];

    await sock.sendMessage(from, {
      text: `🔥 *Roast Session*\n\n@${target.split("@")[0]}: ${roast}\n\n_All in good fun 😂_`,
      mentions: [target]
    }, { quoted: msg });
  }
};
