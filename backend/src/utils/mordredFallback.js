export const buildMordredFallbackResponse = (reason, message, studentContext, userRole) => {
    const department = studentContext?.department ? ` for ${String(studentContext.department)}` : "";
    const roleHint = userRole === "student"
        ? "I’ve noted your message and can help again once the service is back."
        : "I’ve noted your request and can assist again once the service is back.";
    return {
        _id: `mordred-fallback-${Date.now()}`,
        sender: "mordred_ai",
        text: `I’m unable to reach the AI service right now, so I’m falling back to a safe response.${department} Reason: ${reason || "the chat service is temporarily unavailable"}. Your message "${message}" was received. ${roleHint}`,
        is_ticket_created: false,
        systemAction: undefined,
        fallbackUsed: true,
    };
};
