-- Test harness: pgTAP for supabase/tests/*.test.sql (ADR 0003).
-- Cloud Supabase ships pgTAP as an installable extension.
create extension if not exists pgtap;
