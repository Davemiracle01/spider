/**
 * kickall.js — Kick all non-admin members from a group
 * RESTRICTED: Admin + Owner/Dev only
 */
module.exports = {
  command: ["kickall", "nuke"],
  description: "Kick all non-admin members from the group. Requires bot admin.",
  isOwner: true,
  isGroup: true,
  isAdmin: true,

  async run({ sock, msg, from, sender, isSudo }) {
    let meta;
    try {
      meta = await sock.groupMetadata(from);
    } catch (err) {
      return sock.sendMessage(from, { text: `❌ Failed to get group info: ${err.message}` }, { quoted: msg });
    }

    const botId = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
    const toKick = meta.participants.filter(p =>
      !p.admin && p.id !== botId && p.id !== sender
    );

    if (!toKick.length) {
      return sock.sendMessage(from, { text: "✅ No regular members to kick." }, { quoted: msg });
    }

    await sock.sendMessage(from, {
      text: `⚠️ *KICKALL INITIATED*\nRemoving *${toKick.length}* members. Please wait...`
    }, { quoted: msg });

    let kicked = 0;
    let failed = 0;
    for (const p of toKick) {
      try {
        await sock.groupParticipantsUpdate(from, [p.id], "remove");
        kicked++;
        await new Promise(r => setTimeout(r, 800));
      } catch { failed++; }
    }

    await sock.sendMessage(from, {
      text: `✅ *Done!*\n\n👢 Kicked: ${kicked}\n❌ Failed: ${failed}`
    }, { quoted: msg });
  }
};
