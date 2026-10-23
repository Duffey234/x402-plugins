# x402-plugins: YourAITools tools for agent frameworks

Framework packages for six pay-per-call [x402](https://x402.org) APIs (PayGuard, TokenVerdict, SmartPerps, ToolPick, WebRead, InjectScan) on https://api.youraitools.co.

| Framework | Directory | Package | Tests |
|---|---|---|---|
| elizaOS | [`elizaos/`](elizaos/) | `@youraitools/plugin-x402-tools` (6 actions, zero deps) | `node --test test/*.test.js` |
| Coinbase AgentKit | [`agentkit/`](agentkit/) | `@youraitools/agentkit-action-provider` + in-tree PR files in `agentkit/pr-coinbase-agentkit/` | `npm test` |
| LangChain (Python) | [`langchain/`](langchain/) | `langchain-youraitools` | `pytest` |
| CrewAI | [`crewai/`](crewai/) | `crewai-youraitools` | `pytest` |

Mastra and LangGraph examples: https://agentgate-source.pages.dev/agentgate-examples/

All packages: unpaid by default (the tool returns the endpoint's HTTP 402 price and terms), pay per call only with the user's own x402 client or wallet or a prepaid credits key, a per-call spend cap (default $0.01), and no custody. Set `LIVE=1` to run each suite against the real 402 responses (free, nothing is paid).

Safety tools are a safety check only. Trading data is read-only. Not financial advice. Past performance does not guarantee future results.

MIT licensed.
