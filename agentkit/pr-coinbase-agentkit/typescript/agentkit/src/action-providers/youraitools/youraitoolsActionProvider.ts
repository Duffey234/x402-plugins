import { z } from "zod";
import { ActionProvider } from "../actionProvider";
import { CreateAction } from "../actionDecorator";
import { Network } from "../../network";
import { EvmWalletProvider, SvmWalletProvider, WalletProvider } from "../../wallet-providers";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { CheckTokenSchema, FindPaidApiSchema, ReadUrlSchema, ScanTextSchema, ScreenAddressSchema, SmartMoneySchema } from "./schemas";
import { DEFAULT_MAX_PRICE_USD, TOOLS, ToolSpec, YOURAITOOLS_API_BASE } from "./constants";

export interface YourAIToolsActionProviderConfig {
  /** Pay the x402 price with the AgentKit wallet (EVM: Base/Polygon/Arbitrum USDC; SVM: Solana USDC). Default false: return the 402 terms. */
  payWithWallet?: boolean;
  /** Refuse any action priced above this (USD per call). Default 0.01. */
  maxPriceUsd?: number;
  /** Optional prepaid credits key (https://api.youraitools.co/credits/), sent as Authorization: Bearer. */
  creditsKey?: string;
  apiBase?: string;
  fetchImpl?: typeof fetch;
}

const b64json = (s: string): any => { try { return JSON.parse(Buffer.from(s.trim(), "base64").toString("utf8")); } catch { return null; } };

/** Summarize the x402 terms of a 402 response. Never pays. */
export function parsePaymentRequired(headers: Headers, body: any) {
  const doc = headers.get("payment-required") ? b64json(headers.get("payment-required") as string) : null;
  const b = body && typeof body === "object" ? body : {};
  const accepts: any[] = doc?.accepts || b.accepts || [];
  return {
    payment_required: true,
    x402_version: (doc || b).x402Version ?? null,
    resource: doc?.resource?.url || accepts[0]?.resource || null,
    options: accepts.map((a) => ({ network: a.network, price_usd: Number(a.amount ?? a.maxAmountRequired) / 1e6, pay_to: a.payTo, asset: a.asset })),
    how_to_pay: "Enable payWithWallet (pays with this AgentKit wallet via x402) or set a prepaid creditsKey. This provider never holds funds.",
  };
}

/**
 * YourAIToolsActionProvider: six pay-per-call x402 APIs (OFAC screen, Base token safety, Hyperliquid smart money,
 * paid-API finder, web page to Markdown, prompt-injection scan). Per call only, no custody, spend-capped.
 */
export class YourAIToolsActionProvider extends ActionProvider<WalletProvider> {
  private readonly cfg: Required<Omit<YourAIToolsActionProviderConfig, "creditsKey" | "fetchImpl">> & Pick<YourAIToolsActionProviderConfig, "creditsKey" | "fetchImpl">;

  constructor(config: YourAIToolsActionProviderConfig = {}) {
    super("youraitools", []);
    this.cfg = { payWithWallet: config.payWithWallet ?? false, maxPriceUsd: config.maxPriceUsd ?? DEFAULT_MAX_PRICE_USD, apiBase: config.apiBase ?? YOURAITOOLS_API_BASE, creditsKey: config.creditsKey, fetchImpl: config.fetchImpl };
  }

  private async call(walletProvider: WalletProvider, spec: ToolSpec, value: string): Promise<string> {
    if (spec.priceUsd > this.cfg.maxPriceUsd) return JSON.stringify({ error: "over_budget", message: `${spec.name} costs $${spec.priceUsd} per call, above maxPriceUsd=${this.cfg.maxPriceUsd}. Not called.` });
    const base = this.cfg.fetchImpl ?? fetch;
    let f: typeof fetch = base;
    if (this.cfg.payWithWallet && !this.cfg.creditsKey) {
      const client = new x402Client();
      if (walletProvider instanceof EvmWalletProvider) registerExactEvmScheme(client, { signer: walletProvider.toSigner() as any });
      else if (walletProvider instanceof SvmWalletProvider) registerExactSvmScheme(client, { signer: (await walletProvider.toSigner()) as any });
      else return JSON.stringify({ error: "unsupported_wallet", message: "payWithWallet needs an EVM or SVM wallet provider" });
      f = wrapFetchWithPayment(base, client) as typeof fetch;
    }
    const url = `${this.cfg.apiBase.replace(/\/+$/, "")}${spec.path}?${new URLSearchParams({ [spec.param]: value })}`;
    const headers: Record<string, string> = { accept: "application/json", "user-agent": "agentkit-youraitools/0.1" };
    if (this.cfg.creditsKey) headers.authorization = `Bearer ${this.cfg.creditsKey}`;
    try {
      const res = await f(url, { method: "GET", headers });
      const text = await res.text();
      let body: any = null; try { body = JSON.parse(text); } catch { /* not JSON */ }
      if (res.status === 402) return JSON.stringify({ ...parsePaymentRequired(res.headers, body), tool: spec.name, list_price_usd: spec.priceUsd });
      if (res.status >= 400) return JSON.stringify({ error: body?.error || `http_${res.status}`, message: body?.message || text.slice(0, 300), charged: false });
      return JSON.stringify({ tool: spec.name, result: body ?? text.slice(0, 8000) }).slice(0, 12000);
    } catch (e) {
      return JSON.stringify({ error: "request_failed", message: String((e as Error)?.message || e).slice(0, 300) });
    }
  }

  private spec(name: string): ToolSpec { return TOOLS.find((t) => t.name === name) as ToolSpec; }

  @CreateAction({ name: "payguard_screen_address", description: TOOLS[0].description, schema: ScreenAddressSchema })
  async screenAddress(walletProvider: WalletProvider, args: z.infer<typeof ScreenAddressSchema>): Promise<string> { return this.call(walletProvider, this.spec("payguard_screen_address"), args.address); }

  @CreateAction({ name: "tokenverdict_check_token", description: TOOLS[1].description, schema: CheckTokenSchema })
  async checkToken(walletProvider: WalletProvider, args: z.infer<typeof CheckTokenSchema>): Promise<string> { return this.call(walletProvider, this.spec("tokenverdict_check_token"), args.token); }

  @CreateAction({ name: "smartperps_smart_money", description: TOOLS[2].description, schema: SmartMoneySchema })
  async smartMoney(walletProvider: WalletProvider, args: z.infer<typeof SmartMoneySchema>): Promise<string> { return this.call(walletProvider, this.spec("smartperps_smart_money"), args.symbol); }

  @CreateAction({ name: "toolpick_find_paid_api", description: TOOLS[3].description, schema: FindPaidApiSchema })
  async findPaidApi(walletProvider: WalletProvider, args: z.infer<typeof FindPaidApiSchema>): Promise<string> { return this.call(walletProvider, this.spec("toolpick_find_paid_api"), args.need); }

  @CreateAction({ name: "webread_read_url", description: TOOLS[4].description, schema: ReadUrlSchema })
  async readUrl(walletProvider: WalletProvider, args: z.infer<typeof ReadUrlSchema>): Promise<string> { return this.call(walletProvider, this.spec("webread_read_url"), args.url); }

  @CreateAction({ name: "injectscan_scan_text", description: TOOLS[5].description, schema: ScanTextSchema })
  async scanText(walletProvider: WalletProvider, args: z.infer<typeof ScanTextSchema>): Promise<string> { return this.call(walletProvider, this.spec("injectscan_scan_text"), args.text); }

  /** Unpaid calls work on any network; wallet payments use whatever x402 networks the wallet supports. */
  supportsNetwork = (_network: Network) => true;
}

export const youraitoolsActionProvider = (config?: YourAIToolsActionProviderConfig) => new YourAIToolsActionProvider(config);
