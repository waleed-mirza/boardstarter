import type { DatabaseClient, ProfileRow } from "./types";

export type Profile = ProfileRow;
export type ProfileUpdate = Pick<ProfileRow, "full_name">;

export async function getProfileById(
  client: DatabaseClient,
  id: string,
): Promise<Profile | null> {
  const { data, error } = await client.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfile(
  client: DatabaseClient,
  id: string,
  values: ProfileUpdate,
): Promise<Profile> {
  const { data, error } = await client
    .from("profiles")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
