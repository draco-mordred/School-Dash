export type RegistrationApprovalStatus = "pending" | "approved" | "rejected";

export const requiresAdminApproval = (role?: string) => {
  const normalizedRole = String(role ?? "").trim().toLowerCase();
  return ["teacher", "unitconsultant", "unitresident"].includes(normalizedRole);
};

export const getRegistrationApprovalState = (role?: string) => {
  if (requiresAdminApproval(role)) {
    return {
      approvalStatus: "pending" as RegistrationApprovalStatus,
      isActive: false,
      canLogin: false,
    };
  }

  return {
    approvalStatus: "approved" as RegistrationApprovalStatus,
    isActive: true,
    canLogin: true,
  };
};
