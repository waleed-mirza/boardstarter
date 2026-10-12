# Contributing

Boardstarter is open source under the [MIT license](./LICENSE). Issues and pull requests are welcome.

## Setup

Follow [docs/quickstart.md](./docs/quickstart.md).

## Before a pull request

```bash
pnpm typecheck
pnpm lint
pnpm lint:forbidden
pnpm test:unit
```

Changes to payments, auth, or published listings need a test first. [docs/AGENTS.md](./docs/AGENTS.md) has the usual recipes for a field, a payment provider, a preset, and the job row.

Report security issues through [private vulnerability reporting](https://github.com/waleed-mirza/boardstarter/security/advisories/new), not a public issue. See [SECURITY.md](./SECURITY.md).
