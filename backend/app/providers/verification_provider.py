from abc import ABC, abstractmethod
from typing import Dict, Any

class VerificationProvider(ABC):
    @abstractmethod
    def verify(self, doc_type: str, document_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        pass
