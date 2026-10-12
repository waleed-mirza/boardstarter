export function slugPart(value: string, fallback = "value"): string {
  const ascii = value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x00-\x7F]/g, " ");
  const result = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return result || fallback;
}

/** Builds the stable, globally unique namespace used by job URLs. */
export function createJobSlugBase(title: string, companySlug: string): string {
  return `${slugPart(title, "job")}-${slugPart(companySlug, "company")}`;
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(-4);
}

/** Attempt zero is the base; later attempts are deterministic four-digit suffixes. */
export function createJobSlugCandidate(base: string, attempt: number): string {
  if (attempt <= 0) return base;
  return `${base}-${shortHash(`${base}:${Math.floor(attempt)}`)}`;
}
