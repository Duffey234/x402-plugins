# Registry / awesome-list PR drafts (for CMM, Duffey234; one at a time, no bulk PRs)

Step 0, one push (not a PR): push this repo as **github.com/Duffey234/x402-plugins** (main). Every PR below links to it.
Suggested order: 1 → 2 → 3 → 4, at least a few days apart. 3 and 4 have acceptance caveats (see notes).

---

## 1. coinbase/agentkit: in-tree action provider (accepts a code PR, no npm needed)

- Repo: https://github.com/coinbase/agentkit (fork, branch `feat/youraitools-action-provider`)
- Files: `agentkit/pr-coinbase-agentkit/` (see `APPLY.md`: provider dir, one-line export in `action-providers/index.ts`, changeset). Repo rules: signed commits, `pnpm test` + lint must pass, a changeset is required.
- Title: `feat: add YourAITools action provider (pay-per-call x402 safety and data tools)`
- Body:

```
### Description

Adds `youraitoolsActionProvider`, six pay-per-call x402 actions served at https://api.youraitools.co:

- `payguard_screen_address`: OFAC SDN screen for an address before paying ($0.001)
- `tokenverdict_check_token`: Base ERC-20 safety check before buying or approving ($0.005)
- `injectscan_scan_text`: prompt-injection scan of untrusted text ($0.003)
- `toolpick_find_paid_api`: ranks paid x402 APIs for a task from the public discovery indexes ($0.003)
- `webread_read_url`: public page to clean Markdown ($0.002)
- `smartperps_smart_money`: read-only Hyperliquid top-trader positioning ($0.003; not financial advice)

Payment uses the existing `@x402/fetch` + `@x402/evm` / `@x402/svm` stack (same as `x402ActionProvider`), with the wallet provider as signer.

- `payWithWallet` is off by default. When it is off, actions return the endpoint's 402 terms (price, networks, pay-to) and pay nothing.
- `maxPriceUsd` (default $0.01) refuses an action before any request.
- Bad input is rejected with a 400 before the paywall and is never charged.
- No custody, no API key needed.

### Tests

- Unit tests (jest) cover: action registration, unpaid 402 parsing (v2 header and v1 body), the spend cap, the credits header, and unsupported wallets.
- The standalone build of the same code passed a full x402 payment flow. A throwaway in-memory wallet signed against a mock 402 server, and the live 402 terms of all six endpoints were checked.

### Checklist
- [x] Changeset added (patch)
- [x] README for the provider
- [x] Tests added
```

---

## 2. elizaOS: awesome-eliza list entry (the official registry needs an npm publish, which is paused)

- Official route (blocked for now): `elizaos publish` requires an npm account/publish plus `images/logo.jpg` (400×400) and `images/banner.jpg` (1280×640), then it opens the registry PR itself. Resume once npm is unpaused. The images would be resized from an existing Grok-made icon, or made new with GenerateImage.
- Interim: https://github.com/thejoven/awesome-eliza (332★; last push May 2025, so low reach). Section `### 🔒 Infrastructure & Security`, line at the bottom:

```
- [x402 Tools](https://github.com/Duffey234/x402-plugins/tree/main/elizaos) - Pay-per-call x402 actions: OFAC address screen, Base token safety check, prompt-injection scan, paid-API finder, web page to Markdown and read-only Hyperliquid smart-money data (USDC per call, spend cap, no custody)
```

- Title: `Add x402 Tools plugin (pay-per-call safety and data actions)`
- Body:

```
Adds an elizaOS plugin with six x402 pay-per-call actions: OFAC screen, Base token safety check, prompt-injection scan, paid-API finder, page to Markdown, Hyperliquid positioning.

- Zero runtime dependencies.
- Unpaid by default: actions report the 402 price.
- Pays only with the user's own x402 fetch or a prepaid key.
- Per-call spend cap. MIT. Tests included (offline + live 402 checks).
```

---

## 3. LangChain: kyrolabs/awesome-langchain

- Caveat: per contributing.md, PRs are auto-closed for "brand new repo with no history, brand new user, or wrong place". Hold this until the repo has some history and use. Put the line at the **bottom** of `### Services` under `## Tools`:

```
- [langchain-youraitools](https://github.com/Duffey234/x402-plugins/tree/main/langchain): LangChain tools for pay-per-call x402 APIs (OFAC address screen, token safety, prompt-injection scan, paid-API finder, page to Markdown), USDC per call with a spend cap ![GitHub Repo stars](https://img.shields.io/github/stars/Duffey234/x402-plugins?style=social)
```

- Title: `Add langchain-youraitools (x402 pay-per-call tools)`
- Body: `LangChain BaseTool wrappers for six x402 pay-per-call APIs. Unpaid by default (returns the HTTP 402 terms), pays only via the user's own x402 client or a prepaid key, per-call spend cap, MIT, pytest suite incl. live 402 checks.`
- Alternative with better reach, once PyPI is OK'd: a docs integration page PR to langchain-ai/docs. That needs a published PyPI package, which isn't done; it's a new account and a publishing decision for CMM/Tim.

---

## 4. CrewAI: crewAIInc/awesome-crewai

- Caveat: the list excludes "commercial services or products" and "projects with a primary focus on promoting a business". Our tools are paid APIs, so it could be rejected. The list itself points such projects to the CrewAI ecosystem form: https://share.hsforms.com/1djCk-vLCSLmtOd9M4KECZgr87kg (browser).
- If we try the PR anyway, it's a row in the `### Integrations` table:

```
|          [CrewAI + x402 pay-per-call tools](https://github.com/Duffey234/x402-plugins/tree/main/crewai)          |   CrewAI BaseTools for x402 pay-per-call APIs: OFAC address screen, token safety, prompt-injection scan, paid-API finder, page to Markdown. Unpaid by default (returns 402 terms); pays only via the user's own x402 client; spend cap.   | [@Duffey234](https://github.com/Duffey234)         |
```

- Title: `Add CrewAI x402 pay-per-call tools integration`
- Body: `Open-source (MIT) CrewAI tools package wrapping six x402 endpoints; no custody, per-call spend cap, tests included.`
