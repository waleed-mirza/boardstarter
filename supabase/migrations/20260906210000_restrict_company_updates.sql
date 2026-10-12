-- Week 3 settings page makes employers writers of their company profile.
-- Keep subscription-adjacent columns out of authenticated reach (§0.2:
-- never trust client-submitted expiry/price-like fields). Same pattern as
-- the profiles column grant.
revoke update on public.companies from authenticated;
grant update (name, logo_url, website, location, description) on public.companies to authenticated;
