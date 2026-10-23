# @youraitools/agentkit-action-provider (Coinbase AgentKit)

AgentKit action provider for six pay-per-call [x402](https://x402.org) APIs from YourAITools. The same code is prepared as an in-tree community provider for `coinbase/agentkit` in `pr-coinbase-agentkit/` (see `pr-coinbase-agentkit/APPLY.md`).

```ts
import { AgentKit } from "@coinbase/agentkit";
import { youraitoolsActionProvider } from "@youraitools/agentkit-action-provider";

const agentkit = await AgentKit.from({
  walletProvider,                                   // your agent's own wallet
  actionProviders: [youraitoolsActionProvider({ payWithWallet: true, maxPriceUsd: 0.005 })],
});
// LangChain: getLangChainTools(agentkit)   Vercel AI SDK: getVercelAITools(agentkit)
```

Options: `payWithWallet` (default `false`: actions return the 402 terms and nothing is paid; `true`: the AgentKit EVM or SVM wallet signs the x402 USDC payment via `@x402/fetch`), `maxPriceUsd` (default `0.01`, refused before any request), `creditsKey` (prepaid key, `Authorization: Bearer`), `apiBase`, `fetchImpl`.

## Tests

```bash
npm test         # tsc + node --test: action shapes, unpaid 402 terms, spend cap, credits key, and a full x402 payment
                 # signed by a throwaway in-memory wallet against a mock server (no funds, no network)
npm run test:live  # also checks the real 402 terms of all six endpoints (free, nothing is paid)
```

## Tools

| Tool | What it answers | Endpoint | Price (USDC, per call) |
|---|---|---|---|
| `payguard_screen_address` | Is this address on the OFAC SDN list? (safety check only, not legal advice) | `GET https://api.youraitools.co/payguard/v1/address?address=` | $0.001 |
| `tokenverdict_check_token` | Is this Base ERC-20 token safe to touch? (safety check only) | `GET https://api.youraitools.co/tokenverdict/v1/lite?token=` | $0.005 |
| `smartperps_smart_money` | What are the top Hyperliquid traders holding for a coin? (Not financial advice. Past performance does not guarantee future results.) | `GET https://api.youraitools.co/smartperps/v1/lite?symbol=` | $0.003 |
| `toolpick_find_paid_api` | Which paid x402 API should my agent call for a task? | `GET https://api.youraitools.co/toolpick/v1/lite?need=` | $0.003 |
| `webread_read_url` | Read a public web page as clean Markdown | `GET https://api.youraitools.co/webread/v1/read?url=` | $0.002 |
| `injectscan_scan_text` | Does this untrusted text contain a prompt injection? (safety check only) | `GET https://api.youraitools.co/injectscan/v1/scan?text=` | $0.003 |

Full decision guide (all 20 tools): https://api.youraitools.co/docs/which-api

## How payment works

Every call is a plain HTTPS request to an [x402](https://x402.org) endpoint. Per call only: no signup, no subscription, no custody.

- **No wallet configured (default):** the tool returns the endpoint's HTTP 402 terms (price, networks, pay-to) as its result, so the agent or its operator can decide. Nothing is paid.
- **Your own x402 client:** pass a transport that signs x402 USDC payments with *your* agent wallet (Base, Polygon, Arbitrum One or Solana). The package never sees or stores keys and never holds funds.
- **Prepaid credits:** buy a $1 or $5 pack once at https://api.youraitools.co/credits/ and pass the key; each call debits its normal price.
- **Spend cap:** `max_price_usd` (default $0.01) refuses any tool priced above it before any request is made.

Bad input is rejected with a 400 before the paywall and is never charged; only successful (200) results are settled.

Safety tools are a safety check only. Trading data is read-only market data. Not financial advice. Past performance does not guarantee future results.

## License

MIT
