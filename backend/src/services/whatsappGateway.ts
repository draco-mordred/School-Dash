import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

// Initialize client with local persistence to avoid re-authenticating on every restart
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./mordred_whatsapp_session" }),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

// Output setup QR code directly inside terminal shell lines during development checks
client.on("qr", (qr) => {
  console.log("⚔️ MORDRED WhatsApp Gateway activation required. Scan this QR code:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("📡 MORDRED WhatsApp Gateway successfully deployed and online.");
});

client.initialize();

/**
 * Sends a message to a direct phone number or accepts a group invite link, matches it, and sends the payload.
 * @param target The raw telephone string (e.g. "2348012345678") OR a full WhatsApp Group Invite URL string
 * @param message String text payload
 */
export async function sendMordredWhatsAppAlert(target: string, message: string): Promise<boolean> {
  try {
    // Logic branch evaluation: Is it a group invite URL?
    if (target.includes("://whatsapp.com")) {
      const inviteCode = target.split("://whatsapp.com/")[1]?.split(" ")[0];
      if (!inviteCode) throw new Error("Invalid WhatsApp Group Link Profile provided.");
      
      // MORDRED accepts the link, extracts metadata, joins the target group, and dispatches the alert
      const groupId = await client.acceptInvite(inviteCode);
      await client.sendMessage(groupId, message);
      console.log(`💬 MORDRED group broadcast successful.`);
      return true;
    }

    // Standard routing logic fallback for testing directly to your private mobile phone number profile
    // Formats layout cleanly adding '@c.us' suffix strings required by internal API protocols
    const cleanNumber = target.replace(/[^0-9]/g, "");
    const formattedId = `${cleanNumber}@c.us`;
    
    await client.sendMessage(formattedId, message);
    console.log(`💬 MORDRED individual text message delivered to: ${formattedId}`);
    return true;

  } catch (error: any) {
    console.error("❌ MORDRED WhatsApp Pipeline Exception Error:", error.message);
    return false;
  }
}
