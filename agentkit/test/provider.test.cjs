require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { ViemWalletProvider } = require('@coinbase/agentkit');
const { createWalletClient, http } = require('viem');
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { base } = require('viem/chains');
const { youraitoolsActionProvider, TOOLS, NFA, SAFETY } = require('../dist/youraitools');

// AgentKit sends a telemetry event when a wallet provider is built; keep tests offline and quiet.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => (/coinbase\.com\/(amp|metrics)|cca-lite/.test(String(input?.url || input)) ? new Response('{}', { status: 200 }) : realFetch(input, init));

const PAY_TO = '0x3c1A1E01e790Cd326495631B3b38Bd7068F08d6F';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
// Throwaway in-memory wallet: generated per run, never printed or stored, holds no funds. Only signs a mock x402 payload.
const wallet = () => new ViemWalletProvider(createWalletClient({ account: privateKeyToAccount(generatePrivateKey()), chain: base, transport: http('http://127.0.0.1:9') }));
const req402 = (url, amount = '1000') => ({ x402Version: 2, error: 'Payment required', resource: { url, description: 'x', mimeType: 'application/json' }, accepts: [{ scheme: 'exact', network: 'eip155:8453', amount, asset: USDC, payTo: PAY_TO, maxTimeoutSeconds: 120, extra: { name: 'USD Coin', version: '2' } }] });
function mockFetch(calls, { paidBody = { ok: true } } = {}) {
  return async (input, init = {}) => {
    const req = input instanceof Request ? input : new Request(input, init);
    calls.push({ url: req.url, headers: Object.fromEntries(req.headers) });
    if (req.headers.get('payment-signature') || req.headers.get('authorization')) return new Response(JSON.stringify(paidBody), { status: 200, headers: { 'content-type': 'application/json' } });
    const u = new URL(req.url); u.search = '';
    return new Response('{}', { status: 402, headers: { 'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(req402(u.toString()))).toString('base64') } });
  };
}
const actions = (cfg, w = wallet()) => Object.fromEntries(youraitoolsActionProvider(cfg).getActions(w).map((a) => [a.name.replace(/^YourAIToolsActionProvider_/, ''), a]));

test('six AgentKit actions with zod schemas; copy rules', () => {
  const a = actions();
  assert.deepEqual(Object.keys(a).sort(), TOOLS.map((t) => t.name).sort());
  for (const x of Object.values(a)) { assert.ok(x.schema && x.description.length <= 500); assert.doesNotMatch(x.description, /guaranteed|make money|passive income|risk[- ]free/i); }
  assert.ok(a.smartperps_smart_money.description.includes(NFA));
  for (const n of ['payguard_screen_address', 'tokenverdict_check_token', 'injectscan_scan_text']) assert.ok(a[n].description.includes(SAFETY));
  assert.throws(() => a.tokenverdict_check_token.schema.parse({ token: '0x1' }));
});

test('default: unpaid, returns the 402 terms', async () => {
  const calls = []; const a = actions({ fetchImpl: mockFetch(calls) });
  const out = JSON.parse(await a.payguard_screen_address.invoke({ address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96' }));
  assert.equal(out.payment_required, true); assert.equal(out.options[0].price_usd, 0.001); assert.equal(out.options[0].pay_to, PAY_TO);
  assert.equal(calls.length, 1); assert.equal(calls[0].url, 'https://api.youraitools.co/payguard/v1/address?address=0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
});

test('spend cap refuses before any request', async () => {
  const calls = []; const a = actions({ fetchImpl: mockFetch(calls), maxPriceUsd: 0.002, payWithWallet: true });
  assert.equal(JSON.parse(await a.tokenverdict_check_token.invoke({ token: '0x532f27101965dd16442E59d40670FaF5eBB142E4' })).error, 'over_budget');
  assert.equal(calls.length, 0);
});

test('payWithWallet: signs an x402 payment with the AgentKit wallet and retries (mock server, no funds)', async () => {
  const calls = []; const a = actions({ fetchImpl: mockFetch(calls, { paidBody: { sanctioned: false } }), payWithWallet: true });
  const out = JSON.parse(await a.payguard_screen_address.invoke({ address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96' }));
  assert.deepEqual(out.result, { sanctioned: false });
  assert.equal(calls.length, 2); assert.ok(calls[1].headers['payment-signature'], 'second request carries PAYMENT-SIGNATURE');
  const payload = JSON.parse(Buffer.from(calls[1].headers['payment-signature'], 'base64').toString());
  assert.equal(payload.accepted.payTo, PAY_TO); assert.equal(payload.accepted.amount, '1000');
});

test('credits key is sent as Bearer and skips wallet payment', async () => {
  const calls = []; const a = actions({ fetchImpl: mockFetch(calls), creditsKey: 'yatc_test', payWithWallet: true });
  JSON.parse(await a.webread_read_url.invoke({ url: 'https://example.com/' }));
  assert.equal(calls.length, 1); assert.equal(calls[0].headers.authorization, 'Bearer yatc_test');
});

test('live: every endpoint answers 402 with our terms (free, nothing paid)', { skip: process.env.LIVE !== '1' }, async () => {
  const a = actions();
  for (const t of TOOLS) {
    const out = JSON.parse(await a[t.name].invoke({ [t.param]: t.example }));
    assert.equal(out.payment_required, true, t.name);
    assert.ok(out.options.some((o) => o.network === 'eip155:8453' && Math.abs(o.price_usd - t.priceUsd) < 1e-9), t.name);
    assert.ok(out.options.every((o) => [PAY_TO, 'FH73WbbUe2UyNzfy72MJs5nT3NxyDf9GrqE7kzjL2Jte'].includes(o.pay_to)), t.name);
  }
});
