# YourAITools Action Provider

Six pay-per-call [x402](https://x402.org) APIs for AgentKit agents. Per call only, no custody, spend-capped.

| Action | Use it to | Price (USDC/call) |
|---|---|---|
| `payguard_screen_address` | Screen an address against the OFAC SDN list before paying (safety check only, not legal advice) | $0.001 |
| `tokenverdict_check_token` | Check a Base ERC-20 before buying, accepting or approving it (safety check only) | $0.005 |
| `smartperps_smart_money` | See what top Hyperliquid traders hold for a coin (read-only; Not financial advice. Past performance does not guarantee future results.) | $0.003 |
| `toolpick_find_paid_api` | Find which paid x402 API to call for a task | $0.003 |
| `webread_read_url` | Read a public page as clean Markdown | $0.002 |
| `injectscan_scan_text` | Scan untrusted text for prompt injection (safety check only) | $0.003 |

```ts
import { AgentKit, youraitoolsActionProvider } from "@coinbase/agentkit";

const agentkit = await AgentKit.from({
  walletProvider,
  actionProviders: [youraitoolsActionProvider({ payWithWallet: true, maxPriceUsd: 0.005 })],
});
```

- `payWithWallet` (default `false`): when off, actions return the endpoint's 402 terms (price, networks, pay-to) and nothing is paid. When on, the AgentKit wallet signs the x402 USDC payment (EVM: Base, Polygon, Arbitrum One; SVM: Solana).
- `maxPriceUsd` (default `0.01`): actions priced above it are refused before any request.
- `creditsKey`: optional prepaid key from https://api.youraitools.co/credits/ (sent as `Authorization: Bearer`).

Bad input is rejected with HTTP 400 before the paywall and never charged. Decision guide: https://api.youraitools.co/docs/which-api
