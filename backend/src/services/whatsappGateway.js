import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const qrcode = require("qrcode-terminal");

const sessionDataPath = path.resolve(process.cwd(), "mordred_whatsapp_session");
let isGatewayReady = false;
let gatewayInitialization = null;
let resolveGatewayReady = null;
let rejectGatewayReady = null;
let client = null;

try {
    const whatsappModule = require("whatsapp-web.js");
    const Client = whatsappModule?.Client;
    const LocalAuth = whatsappModule?.LocalAuth;

    if (Client && LocalAuth) {
        client = new Client({
            authStrategy: new LocalAuth({ dataPath: sessionDataPath }),
            puppeteer: {
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-zygote",
                    "--single-process",
                ],
            },
        });
    }
} catch (error) {
    console.warn("⚠️ MORDRED WhatsApp Gateway disabled: unable to load whatsapp-web.js", error);
}
const initializeGateway = async () => {
    if (gatewayInitialization)
        return gatewayInitialization;
    gatewayInitialization = new Promise((resolve, reject) => {
        resolveGatewayReady = resolve;
        rejectGatewayReady = reject;
        setTimeout(() => {
            reject(new Error("WhatsApp gateway initialization timed out."));
        }, 30000);
    });
    try {
        client.initialize();
    }
    catch (error) {
        console.error("❌ Failed to initialize MORDRED WhatsApp Gateway:", error.message || error);
        rejectGatewayReady?.(error instanceof Error ? error : new Error(String(error)));
    }
    return gatewayInitialization;
};
const recoverGateway = async (reason) => {
    console.warn(`⚠️ MORDRED WhatsApp Gateway disconnected. Reason: ${reason}`);
    isGatewayReady = false;
    try {
        await client.destroy();
    }
    catch (destroyError) {
        console.warn("⚠️ Failed to destroy WhatsApp client cleanly:", destroyError);
    }
    setTimeout(() => {
        console.log("🔁 Attempting to restart MORDRED WhatsApp Gateway...");
        initializeGateway();
    }, 5000);
};
client.on("qr", (qr) => {
    console.log("⚔️ MORDRED WhatsApp Gateway activation required. Scan this QR code:");
    qrcode.generate(qr, { small: true });
});
client.on("ready", () => {
    isGatewayReady = true;
    console.log("📡 MORDRED WhatsApp Gateway successfully deployed and online.");
    resolveGatewayReady?.();
    resolveGatewayReady = null;
    rejectGatewayReady = null;
});
client.on("auth_failure", (message) => {
    isGatewayReady = false;
    console.error("❌ MORDRED WhatsApp authentication failed:", message);
});
client.on("disconnected", async (reason) => {
    await recoverGateway(reason || "unknown");
});
client.on("change_state", (state) => {
    console.log(`🔄 MORDRED WhatsApp Gateway state changed: ${state}`);
});
client.on("error", async (error) => {
    console.error("❌ MORDRED WhatsApp Gateway internal error:", error?.message || error);
    if (String(error).includes("Execution context was destroyed")) {
        await recoverGateway("execution-context-destroyed");
    }
});
const ensureGatewayReady = async () => {
    if (!isGatewayReady) {
        await initializeGateway();
    }
    return isGatewayReady;
};
/**
 * Sends a message to a direct phone number or accepts a group invite link, matches it, and sends the payload.
 * @param target The raw telephone string (e.g. "2348012345678") OR a full WhatsApp Group Invite URL string
 * @param message String text payload
 */
export async function sendMordredWhatsAppAlert(target, message) {
    try {
        await ensureGatewayReady();
        if (!isGatewayReady) {
            throw new Error("WhatsApp gateway is not ready. Please wait for the client to connect.");
        }
        if (target.includes("://whatsapp.com")) {
            const inviteCode = target.split("://whatsapp.com/")[1]?.split(" ")[0];
            if (!inviteCode)
                throw new Error("Invalid WhatsApp Group Link Profile provided.");
            const groupId = await client.acceptInvite(inviteCode);
            await client.sendMessage(groupId, message);
            console.log(`💬 MORDRED group broadcast successful.`);
            return true;
        }
        const cleanNumber = target.replace(/[^0-9]/g, "");
        if (!cleanNumber)
            throw new Error("Invalid destination phone number.");
        const formattedId = `${cleanNumber}@c.us`;
        await client.sendMessage(formattedId, message);
        console.log(`💬 MORDRED individual text message delivered to: ${formattedId}`);
        return true;
    }
    catch (error) {
        console.error("❌ MORDRED WhatsApp Pipeline Exception Error:", error?.message || error);
        if (String(error?.message || error).includes("Execution context was destroyed")) {
            await recoverGateway("execution-context-destroyed");
        }
        return false;
    }
}
