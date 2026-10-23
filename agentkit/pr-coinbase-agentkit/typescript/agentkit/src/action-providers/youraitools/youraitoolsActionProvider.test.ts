import { youraitoolsActionProvider, parsePaymentRequired } from "./youraitoolsActionProvider";
import { TOOLS, NFA, SAFETY } from "./constants";
import { WalletProvider } from "../../wallet-providers";

const PAY_TO = "0x3c1A1E01e790Cd326495631B3b38Bd7068F08d6F";
const terms = (amount: string) => Buffer.from(JSON.stringify({ x402Version: 2, resource: { url: "https://api.youraitools.co/x" }, accepts: [{ scheme: "exact", network: "eip155:8453", amount, payTo: PAY_TO }] })).toString("base64");
const mockWallet = {} as WalletProvider;

describe("YourAIToolsActionProvider", () => {
  it("exposes six actions with spend-safe copy", () => {
    const actions = youraitoolsActionProvider().getActions(mockWallet);
    expect(actions.map((a) => a.name.split("_").slice(1).join("_")).sort()).toEqual(TOOLS.map((t) => t.name).sort());
    expect(TOOLS.find((t) => t.name === "smartperps_smart_money")!.description).toContain(NFA);
    expect(TOOLS.find((t) => t.name === "payguard_screen_address")!.description).toContain(SAFETY);
    TOOLS.forEach((t) => expect(t.description.length).toBeLessThanOrEqual(500));
  });

  it("returns the 402 terms when payWithWallet is off (never pays)", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response("{}", { status: 402, headers: { "PAYMENT-REQUIRED": terms("1000") } }));
    const p = youraitoolsActionProvider({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const out = JSON.parse(await p.screenAddress(mockWallet, { address: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96" }));
    expect(out.payment_required).toBe(true);
    expect(out.options[0]).toMatchObject({ network: "eip155:8453", price_usd: 0.001, pay_to: PAY_TO });
    expect(fetchImpl).toHaveBeenCalledWith("https://api.youraitools.co/payguard/v1/address?address=0x098B716B8Aaf21512996dC57EB0615e2383E2f96", expect.anything());
  });

  it("refuses actions above maxPriceUsd before any request", async () => {
    const fetchImpl = jest.fn();
    const p = youraitoolsActionProvider({ fetchImpl: fetchImpl as unknown as typeof fetch, maxPriceUsd: 0.002, payWithWallet: true });
    expect(JSON.parse(await p.checkToken(mockWallet, { token: "0x532f27101965dd16442E59d40670FaF5eBB142E4" })).error).toBe("over_budget");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends a prepaid credits key as Bearer and passes 200 results through", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response(JSON.stringify({ verdict: "clean" }), { status: 200 }));
    const p = youraitoolsActionProvider({ fetchImpl: fetchImpl as unknown as typeof fetch, creditsKey: "yatc_test" });
    expect(JSON.parse(await p.scanText(mockWallet, { text: "hello" })).result).toEqual({ verdict: "clean" });
    expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe("Bearer yatc_test");
  });

  it("reports unsupported wallets instead of throwing when payWithWallet is on", async () => {
    const p = youraitoolsActionProvider({ fetchImpl: jest.fn() as unknown as typeof fetch, payWithWallet: true });
    expect(JSON.parse(await p.readUrl(mockWallet, { url: "https://example.com/" })).error).toBe("unsupported_wallet");
  });

  it("parses v1 bodies too", () => {
    const out = parsePaymentRequired(new Headers(), { x402Version: 1, accepts: [{ network: "base", maxAmountRequired: "3000", payTo: PAY_TO, resource: "https://api.youraitools.co/toolpick/v1/lite" }] });
    expect(out.options[0].price_usd).toBe(0.003);
    expect(out.resource).toBe("https://api.youraitools.co/toolpick/v1/lite");
  });
});
