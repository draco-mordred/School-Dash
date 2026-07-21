import { describe, expect, it } from "vitest";
import { buildContactVCard, generateContactQrDataUrl } from "./contactQr";

describe("contact QR helpers", () => {
  it("builds a vCard payload with the contact info", () => {
    const vCard = buildContactVCard({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+123456789",
      website: "https://example.com",
      company: { name: "Example Labs" },
    });

    expect(vCard).toContain("BEGIN:VCARD");
    expect(vCard).toContain("FN:Jane Doe");
    expect(vCard).toContain("EMAIL:jane@example.com");
    expect(vCard).toContain("ORG:Example Labs");
  });

  it("generates a QR data URL successfully", async () => {
    const dataUrl = await generateContactQrDataUrl({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+123456789",
      website: "https://example.com",
      company: { name: "Example Labs" },
    });

    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });
});
