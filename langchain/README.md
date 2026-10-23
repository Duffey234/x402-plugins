# langchain-youraitools

LangChain tools for six pay-per-call [x402](https://x402.org) APIs from YourAITools: OFAC address screening, Base token safety, Hyperliquid smart-money positioning, a paid-API finder, web page to Markdown, and prompt-injection scanning.

```bash
pip install "git+https://github.com/Duffey234/x402-plugins#subdirectory=langchain"   # or from a checkout: pip install ./langchain
```

```python
from langchain_youraitools import get_tools, YourAIToolsClient

tools = get_tools()                      # unpaid: tools return the 402 price/terms
# agent = create_react_agent(llm, tools)  # LangGraph, or bind_tools(...) on any chat model

# Pay per call with your own x402 client (example with the `x402` Python package; your agent's own hot wallet):
# from eth_account import Account
# from x402.clients.requests import x402_requests
# s = x402_requests(Account.from_key(os.environ["AGENT_WALLET_KEY"]))
# http = lambda m, u, h: (lambda r: (r.status_code, dict(r.headers), r.text))(s.request(m, u, headers=h))
# tools = get_tools(YourAIToolsClient(http=http, max_price_usd=0.005))

# Or prepaid credits (no per-call on-chain payment):
# tools = get_tools(YourAIToolsClient(credits_key=os.environ["YAT_CREDITS_KEY"]))
```

## Tests

```bash
pip install -e ".[test]" && pytest            # offline (mocked 402s)
LIVE=1 pytest                                  # also checks the real 402 terms of all six endpoints (free, nothing is paid)
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
