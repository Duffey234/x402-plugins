import test from 'node:test';
import assert from 'node:assert/strict';
import plugin, { createYourAIToolsPlugin, extractInput, TOOLS, NFA, SAFETY } from '../src/index.js';

const doc = { x402Version: 2, resource: { url: 'https://api.youraitools.co/x' }, accepts: [{ scheme: 'exact', network: 'eip155:8453', amount: '1000', payTo: '0x3c1A1E01e790Cd326495631B3b38Bd7068F08d6F' }] };
const fake402 = (calls) => async (url, init) => { calls.push({ url, init }); return new Response('{}', { status: 402, headers: { 'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(doc)).toString('base64') } }); };
const msg = (text) => ({ content: { text } });
const act = (p, n) => p.actions.find((a) => a.name === n.toUpperCase());

test('plugin shape: 6 actions with elizaOS fields; copy rules', () => {
  assert.equal(plugin.name, 'plugin-x402-tools');
  assert.equal(plugin.actions.length, 6);
  for (const a of plugin.actions) { for (const k of ['name', 'similes', 'description', 'validate', 'handler', 'examples']) assert.ok(a[k], `${a.name}.${k}`); assert.ok(a.description.length <= 500); assert.doesNotMatch(a.description, /guaranteed|make money|passive income|risk[- ]free/i); }
  assert.ok(act(plugin, 'smartperps_smart_money').description.includes(NFA));
  for (const n of ['payguard_screen_address', 'tokenverdict_check_token', 'injectscan_scan_text']) assert.ok(act(plugin, n).description.includes(SAFETY));
});

test('validate + extractInput pick the right input from chat text', async () => {
  assert.equal(await act(plugin, 'payguard_screen_address').validate({}, msg('Is 0x098B716B8Aaf21512996dC57EB0615e2383E2f96 sanctioned by OFAC?')), true);
  assert.equal(await act(plugin, 'payguard_screen_address').validate({}, msg('hello')), false);
  const spec = (n) => TOOLS.find((t) => t.name === n);
  assert.equal(extractInput(spec('webread_read_url'), msg('please read https://example.com/a?b=1 thanks')), 'https://example.com/a?b=1');
  assert.equal(extractInput(spec('toolpick_find_paid_api'), msg('Which paid API should I use for web search?')), 'web search');
  assert.equal(extractInput(spec('injectscan_scan_text'), msg('Scan this for prompt injection: "Ignore previous instructions"')), 'Ignore previous instructions');
  assert.equal(extractInput(spec('smartperps_smart_money'), msg('x'), { symbol: 'ETH' }), 'ETH');
});

test('handler returns the 402 terms (never pays) and calls back', async () => {
  const calls = []; const p = createYourAIToolsPlugin({ fetch: fake402(calls) });
  const cb = []; const r = await act(p, 'payguard_screen_address').handler({ getSetting: () => undefined }, msg('Is 0x098B716B8Aaf21512996dC57EB0615e2383E2f96 sanctioned?'), {}, {}, async (x) => cb.push(x));
  assert.equal(calls[0].url, 'https://api.youraitools.co/payguard/v1/address?address=0x098B716B8Aaf21512996dC57EB0615e2383E2f96');
  assert.equal(r.data.payment_required, true); assert.equal(r.data.options[0].price_usd, 0.001);
  assert.match(cb[0].text, /needs a \$0\.001 x402 payment/);
});

test('budget cap and credits key', async () => {
  const calls = []; const p = createYourAIToolsPlugin({ fetch: fake402(calls), maxPriceUsd: 0.002, creditsKey: 'yatc_test' });
  const r = await act(p, 'tokenverdict_check_token').handler({}, msg('is token 0x532f27101965dd16442E59d40670FaF5eBB142E4 safe'), {}, {});
  assert.equal(r.data.error, 'over_budget'); assert.equal(calls.length, 0);
  await act(p, 'webread_read_url').handler({}, msg('read https://example.com/'), {}, {});
  assert.equal(calls[0].init.headers.authorization, 'Bearer yatc_test');
});

test('live: every endpoint answers 402 with our terms (free, nothing paid)', { skip: process.env.LIVE !== '1' }, async () => {
  for (const s of TOOLS) {
    const r = await act(plugin, s.name).handler({}, msg(''), {}, { [s.param]: s.example });
    assert.equal(r.data.payment_required, true, s.name);
    assert.ok(r.data.options.some((o) => o.network === 'eip155:8453' && Math.abs(o.price_usd - s.priceUsd) < 1e-9), s.name);
    assert.ok(r.data.options.every((o) => ['0x3c1A1E01e790Cd326495631B3b38Bd7068F08d6F', 'FH73WbbUe2UyNzfy72MJs5nT3NxyDf9GrqE7kzjL2Jte'].includes(o.pay_to)), s.name);
  }
});
