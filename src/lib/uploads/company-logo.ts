export const MAX_COMPANY_LOGO_BYTES = 2 * 1024 * 1024;

export type CompanyLogoMetadata = {
  extension: "png" | "jpg" | "jpeg" | "webp";
  mimeType: "image/png" | "image/jpeg" | "image/webp";
};

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function extensionFor(name: string): CompanyLogoMetadata["extension"] | null {
  const extension = name.toLowerCase().split(".").pop();
  return extension === "png" || extension === "jpg" || extension === "jpeg" || extension === "webp"
    ? extension
    : null;
}

/** Checks size, extension, declared MIME, and actual file signature. */
export async function validateCompanyLogoFile(file: File): Promise<CompanyLogoMetadata> {
  if (file.size > MAX_COMPANY_LOGO_BYTES) throw new Error("Company logos must be 2 MB or smaller");

  const extension = extensionFor(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected: CompanyLogoMetadata | null =
    hasPrefix(bytes, [137, 80, 78, 71, 13, 10, 26, 10])
      ? { extension: "png", mimeType: "image/png" }
      : hasPrefix(bytes, [255, 216, 255])
        ? { extension: extension === "jpeg" ? "jpeg" : "jpg", mimeType: "image/jpeg" }
        : hasPrefix(bytes, [82, 73, 70, 70]) &&
            new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
          ? { extension: "webp", mimeType: "image/webp" }
          : null;

  if (!detected || !extension || file.type !== detected.mimeType || (detected.extension !== extension && !(detected.mimeType === "image/jpeg" && (extension === "jpg" || extension === "jpeg")))) {
    throw new Error("Upload a valid PNG, JPEG, or WebP image with a matching MIME type");
  }
  return { extension, mimeType: detected.mimeType };
}
