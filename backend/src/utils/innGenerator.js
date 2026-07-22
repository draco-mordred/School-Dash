const normalizeInstitutionName = (value) => {
  const cleaned = (value ?? "").toString().trim();
  if (!cleaned) return "00";

  const letters = cleaned.replace(/[^A-Za-z]/g, "");
  const compact = letters.toUpperCase();
  if (!compact) return "00";

  const prefix = compact.slice(0, 2);
  return prefix.length === 2 ? prefix : `${prefix}0`;
};

const normalizeRoleCode = (role) => {
  switch ((role ?? "student").toString().trim().toLowerCase()) {
    case "admin":
      return "01";
    case "teacher":
      return "02";
    case "student":
      return "03";
    case "parent":
      return "04";
    case "unitconsultant":
      return "05";
    case "unitresident":
      return "06";
    default:
      return "03";
  }
};

const normalizeIdNumber = (value) => {
  const digits = (value ?? "").toString().trim().replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, "0");
};

export const buildInnNumber = ({ institutionName, idNumber, role, sequence }) => {
  const institutionCode = normalizeInstitutionName(institutionName);
  const roleCode = normalizeRoleCode(role);
  const idTail = normalizeIdNumber(idNumber);
  const sequenceCode = String(Math.max(0, sequence)).padStart(3, "0");

  const base = `${institutionCode}${roleCode}${idTail}${sequenceCode}`;
  return base.replace(/\D/g, "").slice(0, 10).padStart(10, "0");
};
