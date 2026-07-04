export const requiresAdminApproval = (role) => {
    const normalizedRole = String(role ?? "").trim().toLowerCase();
    return ["teacher", "unitconsultant", "unitresident"].includes(normalizedRole);
};
export const getRegistrationApprovalState = (role) => {
    if (requiresAdminApproval(role)) {
        return {
            approvalStatus: "pending",
            isActive: false,
            canLogin: false,
        };
    }
    return {
        approvalStatus: "approved",
        isActive: true,
        canLogin: true,
    };
};
