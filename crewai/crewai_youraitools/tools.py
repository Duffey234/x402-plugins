from __future__ import annotations
from typing import Any, Optional, Type
from crewai.tools import BaseTool
from pydantic import BaseModel, Field, create_model
from ._client import TOOLS, BY_NAME, YourAIToolsClient


def _schema(spec) -> Type[BaseModel]:
    return create_model(f"{spec.name}_input", **{spec.param: (str, Field(description=f"{spec.param}, e.g. {spec.example}"))})


class YourAIToolsCrewTool(BaseTool):
    """One YourAITools x402 endpoint as a CrewAI tool. Unpaid by default (returns the 402 terms); give the client an
    x402-paying transport or a prepaid credits key to pay per call. Never holds funds or keys."""
    name: str
    description: str
    args_schema: Type[BaseModel]
    client: Any
    spec_name: str

    def _run(self, **kwargs) -> str:
        spec = BY_NAME[self.spec_name]
        return self.client.call_text(self.spec_name, kwargs.get(spec.param, ""))


def get_tools(client: Optional[YourAIToolsClient] = None, names: Optional[list[str]] = None) -> list[YourAIToolsCrewTool]:
    client = client or YourAIToolsClient()
    return [YourAIToolsCrewTool(name=s.name, description=s.description, args_schema=_schema(s), client=client, spec_name=s.name)
            for s in TOOLS if names is None or s.name in names]
