from app.providers.verification_provider import VerificationProvider
from typing import Dict, Any

class MockVerificationProvider(VerificationProvider):
    """
    Demo verification provider clearly designated with DEMO ONLY badges.
    Never fabricates genuine government API responses.
    """
    def __init__(self, simulate_authorized: bool = False):
        self.simulate_authorized = simulate_authorized

    def verify(self, doc_type: str, document_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        if not self.simulate_authorized:
            return {
                "status": "NOT AVAILABLE",
                "is_authoritative": False,
                "provider_name": "None Connected",
                "disclaimer": "Official verification source unavailable. AI automated screening completed.",
                "verified": False
            }

        return {
            "status": "DEMO_CONFIRMED",
            "is_authoritative": False,
            "provider_name": f"Mock {doc_type} Gateway (Sandbox)",
            "disclaimer": "DEMO ONLY — NOT OFFICIAL GOVERNMENT VERIFICATION. Authoritative source simulated for testing.",
            "verified": True,
            "reference_number": "DEMO-AUTH-2026-9921"
        }
