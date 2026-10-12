type SqlClient = {
  query(text: string): Promise<unknown>;
};

/**
 * Remove fixture-owned rows that would otherwise block the auth-user reset.
 * The admin audit trail deliberately restricts profile deletion, so its
 * fixture rows must be cleared before auth.users cascades into profiles.
 */
export async function clearFixtureUsers(client: SqlClient): Promise<void> {
  await client.query(`
    delete from public.admin_actions
    where actor_id in (
      select id
      from public.profiles
      where id in (
        select id
        from auth.users
        where coalesce(raw_app_meta_data ->> 'seed_source', '') = 'fixture-test'
      )
    )
  `);
  await client.query(`
    delete from auth.identities
    where user_id in (
      select id from auth.users
      where coalesce(raw_app_meta_data ->> 'seed_source', '') = 'fixture-test'
    )
  `);
  await client.query(`
    delete from auth.users
    where coalesce(raw_app_meta_data ->> 'seed_source', '') = 'fixture-test'
  `);
}
