"""
Aaliyah Tools Interface
Defines the standard interface for all tools Aaliyah can use.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any

class AaliyahTool(ABC):
    @abstractmethod
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the tool"""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Tool name for LLM invocation"""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what the tool does"""
        pass
