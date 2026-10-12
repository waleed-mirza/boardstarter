-- pgTAP harness sanity (Test Gate 1 item 5). Executed by scripts/test-db.ts
-- inside a transaction that rolls back — files must not COMMIT/BEGIN themselves.
select plan(2);
select has_extension('pgtap', 'pgTAP extension is installed on the test database');
select is(1 + 1, 2, 'the runner executes pgTAP assertions and reads their results');
select * from finish();
