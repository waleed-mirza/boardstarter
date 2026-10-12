import { describe, expect, it } from "vitest";

import { MAX_COMPANY_LOGO_BYTES, validateCompanyLogoFile } from "@/lib/uploads/company-logo";

const pngSignature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const jpegSignature = Uint8Array.from([255, 216, 255, 224]);
const webpSignature = new TextEncoder().encode("RIFF");

function file(bytes: Uint8Array, name: string, type: string) {
  return new File([bytes.buffer as ArrayBuffer], name, { type });
}

describe("company logo file validation", () => {
  it("accepts a PNG with a matching MIME type", async () => {
    await expect(validateCompanyLogoFile(file(pngSignature, "logo.png", "image/png"))).resolves.toMatchObject({
      extension: "png",
      mimeType: "image/png",
    });
  });

  it("accepts JPEG and WebP signatures", async () => {
    await expect(validateCompanyLogoFile(file(jpegSignature, "logo.jpg", "image/jpeg"))).resolves.toMatchObject({ extension: "jpg" });
    const webp = new Uint8Array(12);
    webp.set(webpSignature, 0);
    webp.set(new TextEncoder().encode("WEBP"), 8);
    await expect(validateCompanyLogoFile(file(webp, "logo.webp", "image/webp"))).resolves.toMatchObject({ extension: "webp" });
  });

  it("rejects an executable renamed to PNG", async () => {
    await expect(validateCompanyLogoFile(file(new TextEncoder().encode("MZ-not-an-image"), "logo.png", "image/png"))).rejects.toThrow(/image/i);
  });

  it("rejects files over the 2 MB limit", async () => {
    await expect(validateCompanyLogoFile(file(new Uint8Array(MAX_COMPANY_LOGO_BYTES + 1), "logo.png", "image/png"))).rejects.toThrow(/2 MB/i);
  });

  it("rejects a supported signature with a mismatched MIME type", async () => {
    await expect(validateCompanyLogoFile(file(pngSignature, "logo.png", "image/jpeg"))).rejects.toThrow(/MIME/i);
  });
});
