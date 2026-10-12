# Job Board Template

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

A self-hostable niche job board: Next.js 16 + Supabase + Netlify. Employers pay the operator for listings. Open source under the [MIT license](./LICENSE).

> A self-hostable, rebrandable job board for focused communities.

## Status

Clone it, configure it, and deploy your own board. See [docs/quickstart.md](./docs/quickstart.md) for the 15-minute path, [docs/AGENTS.md](./docs/AGENTS.md) for maintenance recipes, and [CONTRIBUTING.md](./CONTRIBUTING.md) to send a change.

## Develop

```bash
pnpm install
pnpm setup        # migrations, seed, preset, and first admin
pnpm dev          # http://localhost:3000
```

## Quality gates

```bash
pnpm typecheck && pnpm lint && pnpm lint:forbidden
pnpm test:unit    # Vitest
pnpm test:db      # pgTAP (needs TEST_DATABASE_URL — see docs/configuration.md)
pnpm test:e2e     # Playwright + axe + visual baselines
pnpm build
```

## Docs

- [Quickstart](./docs/quickstart.md)
- [Configuration](./docs/configuration.md)
- [Theming](./docs/theming.md)
- [Payments](./docs/payments.md) · [Deployment](./docs/deployment.md) · [SEO](./docs/seo.md) · [Troubleshooting](./docs/troubleshooting.md)

## License

[MIT](./LICENSE) © Muhammad waleed akhtar
