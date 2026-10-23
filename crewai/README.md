# crewai-youraitools

CrewAI tools for six pay-per-call [x402](https://x402.org) APIs from YourAITools: OFAC address screening, Base token safety, Hyperliquid smart-money positioning, a paid-API finder, web page to Markdown, and prompt-injection scanning.

```bash
pip install "git+https://github.com/Duffey234/x402-plugins#subdirectory=crewai"   # or from a checkout: pip install ./crewai
```

```python
from crewai import Agent, Task, Crew
from crewai_youraitools import get_tools, YourAIToolsClient

tools = get_tools()   # unpaid: each tool returns the endpoint's 402 price/terms
guard = Agent(role="Payment guard", goal="Screen counterparties and tokens before any payment",
              backstory="Runs a safety check only; never moves funds.", tools=tools)

# Pay per call with your own x402 client / agent wallet, or prepaid credits:
# tools = get_tools(YourAIToolsClient(http=my_x402_transport, max_price_usd=0.005))
# tools = get_tools(YourAIToolsClient(credits_key=os.environ["YAT_CREDITS_KEY"]))
```

`http` is any callable `(method, url, headers) -> (status, headers, body_text)`; see the LangChain package README for an example built on the `x402` Python package.

## Tests

```bash
pip install -e ".[test]" && pytest     # offline (mocked 402s)
LIVE=1 pytest                           # also checks the real 402 terms of all six endpoints (free, nothing is paid)
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
