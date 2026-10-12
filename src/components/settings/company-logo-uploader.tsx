"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlusIcon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { CompanyLogo } from "@/components/jobs/company-logo";
import { Button } from "@/components/ui/button";
import { uploadCompanyLogoAction } from "@/lib/actions/company-logo";
import { MAX_COMPANY_LOGO_BYTES } from "@/lib/uploads/company-logo";

export function CompanyLogoUploader({
  company,
}: {
  company: { name: string; logo_url: string | null };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function selectFile(next: File | null) {
    setError(null);
    setSaved(false);
    setFile(next);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return next ? URL.createObjectURL(next) : null;
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedFile = inputRef.current?.files?.[0] ?? file;
    if (!selectedFile) {
      setError("Choose a PNG, JPEG, or WebP image first.");
      return;
    }
    if (selectedFile.size > MAX_COMPANY_LOGO_BYTES) {
      setError("Company logos must be 2 MB or smaller");
      return;
    }
    const formData = new FormData();
    formData.set("file", selectedFile);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await uploadCompanyLogoAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setFile(null);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  const imageSrc = previewUrl ?? company.logo_url;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <CompanyLogo name={company.name} src={imageSrc} size={48} />
        <div>
          <p className="font-medium">Company logo</p>
          <p className="mt-1 text-sm text-fg-muted">PNG, JPEG, or WebP. Maximum 2 MB.</p>
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm focus-within:ring-2 focus-within:ring-accent/50 hover:bg-bg-muted">
          <ImagePlusIcon className="size-4" aria-hidden />
          <span>{file ? file.name : "Choose image"}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            onInput={(event) => selectFile(event.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <Button type="submit" variant="outline" disabled={pending}>
          <UploadIcon aria-hidden />
          {pending ? "Uploading…" : "Upload logo"}
        </Button>
        {saved ? (
          <span className="text-sm text-success" role="status">
            Saved.
          </span>
        ) : null}
      </form>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
