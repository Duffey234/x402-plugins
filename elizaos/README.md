# @youraitools/plugin-x402-tools (elizaOS)

elizaOS plugin with six pay-per-call [x402](https://x402.org) actions from YourAITools: `PAYGUARD_SCREEN_ADDRESS`, `TOKENVERDICT_CHECK_TOKEN`, `SMARTPERPS_SMART_MONEY`, `TOOLPICK_FIND_PAID_API`, `WEBREAD_READ_URL`, `INJECTSCAN_SCAN_TEXT`. Zero runtime dependencies (uses `fetch`).

```bash
# from a checkout (npm publishing is not available yet):
# copy ./elizaos into your project, or install from the GitHub repo once it is published
```

```js
// character / project config
import x402Tools, { createYourAIToolsPlugin } from '@youraitools/plugin-x402-tools';

export const character = { name: 'Guard', plugins: [x402Tools] };       // unpaid: actions report the 402 price

// Pay per call with your agent's own wallet via @x402/fetch:
// import { wrapFetchWithPayment } from '@x402/fetch';
// const paidFetch = wrapFetchWithPayment(fetch, yourX402Client);     // your signer, your wallet
// plugins: [createYourAIToolsPlugin({ fetch: paidFetch, maxPriceUsd: 0.005 })]
```

Settings (character `settings.secrets` or env):

| Setting | Meaning |
|---|---|
| `YOURAITOOLS_CREDITS_KEY` | Optional prepaid credits key (https://api.youraitools.co/credits/). Sent as `Authorization: Bearer`. |
| `YOURAITOOLS_MAX_PRICE_USD` | Per-call spend cap, default `0.01`. Actions priced above it are refused before any request. |

Inputs are taken from action options (`{ address }`, `{ token }`, `{ symbol }`, `{ need }`, `{ url }`, `{ text }`) or parsed from the message text (addresses, URLs, quoted text).

## Tests

```bash
node --test test/            # offline (mocked 402s)
LIVE=1 node --test test/     # also checks the real 402 terms of all six endpoints (free, nothing is paid)
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
