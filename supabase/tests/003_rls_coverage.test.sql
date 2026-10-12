select plan(2);

select ok(
   (select count(*) >= 14
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and not exists (
       select 1 from pg_depend d
       where d.classid = 'pg_class'::regclass
         and d.objid = c.oid and d.deptype = 'e'
     )
     and c.relrowsecurity),
  'every application table has row level security enabled'
);

select is(
  (select count(*)::int
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and not exists (
       select 1 from pg_depend d
       where d.classid = 'pg_class'::regclass
         and d.objid = c.oid and d.deptype = 'e'
     )
     and not exists (
       select 1 from pg_policies p
       where p.schemaname = 'public' and p.tablename = c.relname
     )),
  0,
  'every application table has at least one RLS policy'
);

select * from finish();
