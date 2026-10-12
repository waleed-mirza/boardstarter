# ADR 0001 — Netlify deploy deferred from Week 1 to Week 10

- **Status:** Accepted (user decision, 2026-09-06)
- **Context:** Build plan §Week 1 task 12 and Test Gate 1 item 7 require creating the Netlify site, deploying, and passing the deployed smoke suite in Week 1.
- **Decision:** Skip task 12 in Week 1; do the first deploy and deployed-smoke run in Week 10 (release week). `netlify.toml` still ships in Week 1 so the deploy target is defined early.
- **Consequences:** Test Gate 1 is satisfied with items 1–6 and 8–10; item 7 (deployed smoke) moves to Week 10's gate. The same deferral applies to Week 3's deployed auth subset: local auth coverage and an external-URL Playwright mode land in Week 3, while the actual Netlify run moves to Week 10. Local-green ≠ Netlify-green risk is accepted for weeks 1–9; the weekly "deploy every week" rule (§0.1.9) resumes once the site exists.
