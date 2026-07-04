export const sendAccountApprovalEmail = async ({ to, name, loginUrl, message, }) => {
    const recipient = to || "unknown";
    const targetUrl = loginUrl || process.env.FRONTEND_URL || "http://localhost:5173/login";
    const body = message || `Hi ${name}, your account has been approved. Please sign in using the password you set during registration.`;
    console.log(`[account-approval-email] to=${recipient} loginUrl=${targetUrl} message=${body}`);
    return {
        sent: false,
        reason: "smtp-not-configured",
        recipient,
    };
};
