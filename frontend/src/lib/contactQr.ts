export type ContactQrDeveloper = {
  name: string;
  email: string;
  phone: string;
  website: string;
  company?: {
    name?: string;
  };
};

export const buildContactVCard = (developer: ContactQrDeveloper) => {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${developer.name}`,
    `ORG:${developer.company?.name ?? "MedLog"}`,
    `EMAIL:${developer.email}`,
    `TEL:${developer.phone}`,
    `URL:${developer.website}`,
    "END:VCARD",
  ].join("\n");
};

export const generateContactQrDataUrl = async (developer: ContactQrDeveloper, size = 240) => {
  const { default: QRCode } = await import("qrcode");

  return QRCode.toDataURL(buildContactVCard(developer), {
    width: size,
    margin: 1,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
};
