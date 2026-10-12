import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "@/lib/data/types";

const mocks = vi.hoisted(() => ({
  getCompanyById: vi.fn(),
  updateCompanyLogo: vi.fn(),
}));

vi.mock("@/lib/data/companies", () => mocks);

import { uploadCompanyLogo } from "@/lib/data/company-logos";

function storageClient(options: {
  uploadError?: Error | null;
  publicUrl?: string;
  remove?: ReturnType<typeof vi.fn>;
}) {
  const upload = vi.fn().mockResolvedValue({ error: options.uploadError ?? null });
  const remove = options.remove ?? vi.fn().mockResolvedValue({ error: null });
  const getPublicUrl = vi.fn().mockReturnValue({
    data: { publicUrl: options.publicUrl ?? "https://cdn.example.test/company-logos/user/new.png" },
  });
  const from = vi.fn().mockReturnValue({ upload, remove, getPublicUrl });
  return {
    client: { storage: { from } } as unknown as DatabaseClient,
    upload,
    remove,
    getPublicUrl,
  };
}

function pngFile() {
  return new File([new Uint8Array([137, 80, 78, 71])], "logo.png", { type: "image/png" });
}

describe("company logo data layer", () => {
  beforeEach(() => {
    mocks.getCompanyById.mockReset();
    mocks.updateCompanyLogo.mockReset();
  });

  it("rejects a company that is not owned by the current user", async () => {
    mocks.getCompanyById.mockResolvedValue(null);
    const { client, upload } = storageClient({});

    await expect(
      uploadCompanyLogo(client, "user-a", "company-a", pngFile(), {
        extension: "png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow("Company not found");
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads the new object, updates the company, and removes the old object", async () => {
    mocks.getCompanyById.mockResolvedValue({
      id: "company-a",
      owner_id: "user-a",
      logo_url: "https://cdn.example.test/storage/v1/object/public/company-logos/user-a/old.png",
    });
    mocks.updateCompanyLogo.mockResolvedValue({});
    const { client, upload, remove, getPublicUrl } = storageClient({
      publicUrl: "https://cdn.example.test/storage/v1/object/public/company-logos/user-a/new.png",
    });

    const result = await uploadCompanyLogo(client, "user-a", "company-a", pngFile(), {
      extension: "png",
      mimeType: "image/png",
    });

    expect(result).toContain("company-logos/user-a/new.png");
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-a\/.+\.png$/),
      expect.any(File),
      expect.objectContaining({ contentType: "image/png", upsert: false }),
    );
    expect(getPublicUrl).toHaveBeenCalledOnce();
    expect(mocks.updateCompanyLogo).toHaveBeenCalledWith(client, "company-a", result);
    expect(remove).toHaveBeenCalledWith(["user-a/old.png"]);
  });

  it("removes the new object when the company update fails", async () => {
    mocks.getCompanyById.mockResolvedValue({ id: "company-a", owner_id: "user-a", logo_url: null });
    mocks.updateCompanyLogo.mockRejectedValue(new Error("database unavailable"));
    const { client, remove } = storageClient({});

    await expect(
      uploadCompanyLogo(client, "user-a", "company-a", pngFile(), {
        extension: "png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow("database unavailable");
    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^user-a\/.+\.png$/)]);
  });
});
