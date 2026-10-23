# Applying this to a coinbase/agentkit fork (CMM)

1. Copy `typescript/agentkit/src/action-providers/youraitools/` into the fork.
2. Add `export * from "./youraitools";` to `typescript/agentkit/src/action-providers/index.ts`.
3. Copy `.changeset/youraitools-action-provider.md`.
4. `cd typescript && pnpm install && pnpm --filter @coinbase/agentkit test -- youraitools && pnpm run lint`.
5. Commits must be signed (repo rule). Open one PR with the text in ../PR.md.
