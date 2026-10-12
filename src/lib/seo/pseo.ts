import { slugPart } from "@/lib/jobs/slug";

export type PseoRoute =
  | { kind: "remote-category"; slug: string; categorySlug: string }
  | { kind: "location"; slug: string; locationSlug: string };

export function parsePseoSlug(slug: string): PseoRoute | null {
  const value = slug.trim().toLowerCase();
  const remote = /^remote-([a-z0-9]+(?:-[a-z0-9]+)*)-jobs$/.exec(value);
  if (remote?.[1]) return { kind: "remote-category", slug: value, categorySlug: remote[1] };
  const location = /^jobs-in-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
  if (location?.[1]) return { kind: "location", slug: value, locationSlug: location[1] };
  return null;
}

export function pseoLocationSlug(location: string): string {
  return slugPart(location, "location");
}

export function buildPseoIntro(route: PseoRoute, label: string, count: number): string {
  if (route.kind === "remote-category") {
    return `Explore ${count} remote ${label.toLowerCase()} ${count === 1 ? "role" : "roles"} from teams hiring across borders.`;
  }
  return `Browse ${count} live ${count === 1 ? "job" : "jobs"} in ${label}, with fresh opportunities added as teams grow.`;
}
