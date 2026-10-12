# SEO

- Google for Jobs structured data is emitted on every public job detail page. Expired
  listings remain available for reference, carry a past `validThrough`, and are
  marked `noindex`.
- `sitemap.ts` includes live jobs, companies, categories, tags, and pSEO targets;
  `robots.ts` excludes private and API paths.
- Programmatic pages use `/remote-[category]-jobs` and `/jobs-in-[location]`.
  The `pseo_min_live_jobs` site setting prevents thin pages from being indexable.
  Cache Components streams the public shell, so below-threshold requests render
  the not-found boundary with `noindex` (the documented soft-404 behavior).
- RSS is available at `/feed.xml` and `/categories/[slug]/feed.xml`.
- Set `GOOGLE_INDEXING_SA_JSON` to a service-account JSON (or base64url JSON) to
  enable best-effort `URL_UPDATED`/`URL_DELETED` notifications on publish/expire.
