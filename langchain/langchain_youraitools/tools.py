from __future__ import annotations
from typing import Optional, Type
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field, create_model
from ._client import TOOLS, BY_NAME, YourAIToolsClient


def _schema(spec) -> Type[BaseModel]:
    return create_model(f"{spec.name}_input", **{spec.param: (str, Field(description=f"{spec.param}, e.g. {spec.example}"))})


class YourAIToolsTool(BaseTool):
    """One YourAITools x402 endpoint as a LangChain tool. Unpaid by default: returns the 402 terms.
    Give the client an x402-paying transport to pay per call (USDC); the client never holds funds or keys."""
    name: str
    description: str
    args_schema: Type[BaseModel]
    client: YourAIToolsClient
    spec_name: str

    def _run(self, **kwargs) -> str:
        spec = BY_NAME[self.spec_name]
        return self.client.call_text(self.spec_name, kwargs.get(spec.param, ""))


def get_tools(client: Optional[YourAIToolsClient] = None, names: Optional[list[str]] = None) -> list[YourAIToolsTool]:
    """All six tools (or a subset by name) sharing one client."""
    client = client or YourAIToolsClient()
    return [YourAIToolsTool(name=s.name, description=s.description, args_schema=_schema(s), client=client, spec_name=s.name)
            for s in TOOLS if names is None or s.name in names]
