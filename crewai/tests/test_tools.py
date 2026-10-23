import base64, json, os, re
import pytest
from crewai_youraitools import get_tools, YourAIToolsClient, TOOLS, NFA, SAFETY

def fake_402(price_atomic="3000"):
    doc = {"x402Version": 2, "resource": {"url": "https://api.youraitools.co/x"}, "accepts": [{"scheme": "exact", "network": "eip155:8453", "amount": price_atomic, "payTo": "0x3c1A1E01e790Cd326495631B3b38Bd7068F08d6F", "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"}]}
    calls = []
    def http(method, url, headers):
        calls.append((method, url, headers))
        return 402, {"PAYMENT-REQUIRED": base64.b64encode(json.dumps(doc).encode()).decode()}, json.dumps({"x402Version": 1, "accepts": []})
    return http, calls

def test_six_tools_with_schemas_and_copy_rules():
    tools = get_tools()
    assert [t.name for t in tools] == [s.name for s in TOOLS] and len(tools) == 6
    d = {t.name: t.description for t in tools}
    assert NFA in d["smartperps_smart_money"]
    for n in ["payguard_screen_address", "tokenverdict_check_token", "injectscan_scan_text"]:
        assert SAFETY in d[n]
    for t in tools:
        assert len(t.description) <= 500 and "$0.00" in t.description
        assert not re.search(r"guaranteed|make money|passive income|risk[- ]free|\d+% (apy|apr|return)", t.description, re.I)

def test_402_terms_are_returned_not_paid():
    http, calls = fake_402()
    t = {x.name: x for x in get_tools(YourAIToolsClient(http=http))}["toolpick_find_paid_api"]
    out = json.loads(t.run(**{"need": "web search"}))
    assert out["payment_required"] is True and out["options"][0]["price_usd"] == 0.003
    assert out["options"][0]["pay_to"].startswith("0x3c1A") and "never holds funds" in out["how_to_pay"]
    assert calls[0][1] == "https://api.youraitools.co/toolpick/v1/lite?need=web+search"

def test_budget_cap_and_empty_input_never_call():
    http, calls = fake_402()
    tools = {x.name: x for x in get_tools(YourAIToolsClient(http=http, max_price_usd=0.002))}
    assert json.loads(tools["tokenverdict_check_token"].run(**{"token": "0x532f27101965dd16442E59d40670FaF5eBB142E4"}))["error"] == "over_budget"
    assert json.loads(tools["payguard_screen_address"].run(**{"address": " "}))["error"] == "bad_request"
    assert calls == []

def test_paid_200_passes_result_through():
    def http(m, u, h): return 200, {}, json.dumps({"sanctioned": False})
    t = get_tools(YourAIToolsClient(http=http), names=["payguard_screen_address"])[0]
    assert json.loads(t.run(**{"address": "0x098B716B8Aaf21512996dC57EB0615e2383E2f96"}))["result"] == {"sanctioned": False}

@pytest.mark.skipif(os.environ.get("LIVE") != "1", reason="set LIVE=1 to hit the real 402 endpoints (free, nothing is paid)")
def test_live_402_for_every_tool():
    for t in get_tools():
        spec = next(s for s in TOOLS if s.name == t.name)
        out = json.loads(t.run(**{spec.param: spec.example}))
        assert out["payment_required"] is True, out
        assert any(o["network"] == "eip155:8453" and abs(o["price_usd"] - spec.price_usd) < 1e-9 for o in out["options"]), out
        assert all(o["pay_to"] in ("0x3c1A1E01e790Cd326495631B3b38Bd7068F08d6F", "FH73WbbUe2UyNzfy72MJs5nT3NxyDf9GrqE7kzjL2Jte") for o in out["options"])
