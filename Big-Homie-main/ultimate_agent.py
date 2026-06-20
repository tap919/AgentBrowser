"""
Ultimate Agent Integration Layer
Connects Big Homie with Claw Protect (security) and AgentBrowser (browser automation)

This module provides:
1. Claw Protect security validation before any action
2. AgentBrowser as the primary browser backend
3. Unified API for all three systems to work together
"""

import json
import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum
from loguru import logger
import httpx
from datetime import datetime


class IntegrationStatus(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


@dataclass
class SecurityValidationResult:
    """Result from Claw Protect security check"""

    approved: bool
    risk_level: str  # low, medium, high, critical
    warnings: List[str] = field(default_factory=list)
    blocked_reasons: List[str] = field(default_factory=list)
    scan_id: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class AgentAction:
    """An action to be validated and executed"""

    id: str
    action_type: str  # browser_navigate, shell_execute, api_call, etc.
    description: str
    parameters: Dict[str, Any]
    context: Dict[str, Any] = field(default_factory=dict)
    requires_confirmation: bool = False


class ClawProtectClient:
    """Client for Claw Protect security API"""

    def __init__(self, base_url: str = "http://localhost:3333"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)
        self.api_key: Optional[str] = None
        self.status = IntegrationStatus.DISCONNECTED

    async def connect(self, api_key: Optional[str] = None) -> bool:
        """Connect to Claw Protect API"""
        try:
            self.api_key = api_key or os.getenv("CLAW_PROTECT_API_KEY")
            self.status = IntegrationStatus.CONNECTING

            response = await self.client.get(f"{self.base_url}/api/health")
            if response.status_code == 200:
                self.status = IntegrationStatus.CONNECTED
                logger.info("Connected to Claw Protect")
                return True
            else:
                self.status = IntegrationStatus.ERROR
                return False
        except Exception as e:
            logger.warning(f"Claw Protect not available: {e}")
            self.status = IntegrationStatus.DISCONNECTED
            return False

    async def validate_action(self, action: AgentAction) -> SecurityValidationResult:
        """Validate an action through Claw Protect security layers"""
        if self.status != IntegrationStatus.CONNECTED:
            logger.warning(
                "Claw Protect not connected, allowing action without validation"
            )
            return SecurityValidationResult(approved=True, risk_level="unknown")

        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}

        try:
            # Use prompt-injection endpoint as security validation
            response = await self.client.post(
                f"{self.base_url}/api/v1/scan/prompt-injection",
                headers=headers,
                json={
                    "text": action.description + " " + json.dumps(action.parameters)
                },
            )

            if response.status_code in [200, 401, 403]:
                # If it's 401/403, it means the module requires auth
                # Try without auth or check if detected
                if response.status_code == 200:
                    data = response.json()
                    detected = data.get("detected", False)
                    return SecurityValidationResult(
                        approved=not detected,
                        risk_level="high" if detected else "low",
                        warnings=data.get("warnings", []),
                        blocked_reasons=["Prompt injection detected"] if detected else [],
                    )
                # For auth-required, allow the action (you need an API key)
                return SecurityValidationResult(approved=True, risk_level="unknown")
            else:
                logger.warning(f"Security validation failed: {response.status_code}")
                return SecurityValidationResult(
                    approved=False,
                    risk_level="high",
                    blocked_reasons=[f"Security API error: {response.status_code}"],
                )
        except Exception as e:
            logger.error(f"Security validation error: {e}")
            return SecurityValidationResult(approved=True, risk_level="unknown")

    async def check_prompt_injection(self, text: str) -> bool:
        """Check if text contains prompt injection"""
        try:
            response = await self.client.post(
                f"{self.base_url}/api/v1/scan/prompt-injection", json={"text": text}
            )
            return response.status_code == 200 and not response.json().get(
                "detected", False
            )
        except:
            return True

    async def scan_for_secrets(self, content: str) -> List[Dict[str, Any]]:
        """Scan content for exposed secrets"""
        try:
            response = await self.client.post(
                f"{self.base_url}/api/v1/scan/secrets",
                json={"content": content},
            )
            if response.status_code == 200:
                return response.json().get("findings", [])
            return []
        except:
            return []

    async def get_agent_status(self) -> Dict[str, Any]:
        """Get current security monitoring status"""
        try:
            response = await self.client.get(f"{self.base_url}/api/v1/agent/status")
            if response.status_code == 200:
                return response.json()
            return {}
        except:
            return {}

    async def close(self):
        """Close the client"""
        await self.client.aclose()


class AgentBrowserClient:
    """Client for AgentBrowser API"""

    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=60.0)
        self.status = IntegrationStatus.DISCONNECTED

    async def connect(self) -> bool:
        """Connect to AgentBrowser API"""
        try:
            self.status = IntegrationStatus.CONNECTING
            response = await self.client.get(f"{self.base_url}/api/health")
            if response.status_code == 200:
                self.status = IntegrationStatus.CONNECTED
                logger.info("Connected to AgentBrowser")
                return True
            else:
                self.status = IntegrationStatus.ERROR
                return False
        except Exception as e:
            logger.warning(f"AgentBrowser not available: {e}")
            self.status = IntegrationStatus.DISCONNECTED
            return False

    async def browse(
        self, url: str, mode: str = "browse", extract: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Execute a browse task through AgentBrowser"""
        if self.status != IntegrationStatus.CONNECTED:
            raise RuntimeError("AgentBrowser not connected")

        response = await self.client.post(
            f"{self.base_url}/api/agent/browse",
            json={
                "url": url,
                "mode": mode,  # browse, research, scrape
                "extract": extract or [],
            },
        )
        response.raise_for_status()
        return response.json()

    async def research(self, query: str, depth: int = 3) -> Dict[str, Any]:
        """Execute research through AgentBrowser"""
        if self.status != IntegrationStatus.CONNECTED:
            raise RuntimeError("AgentBrowser not connected")

        response = await self.client.post(
            f"{self.base_url}/api/agent/research", json={"query": query, "depth": depth}
        )
        response.raise_for_status()
        return response.json()

    async def scrape(self, url: str, selectors: Dict[str, str]) -> Dict[str, Any]:
        """Scrape specific elements from a page"""
        if self.status != IntegrationStatus.CONNECTED:
            raise RuntimeError("AgentBrowser not connected")

        response = await self.client.post(
            f"{self.base_url}/api/agent/scrape",
            json={"url": url, "selectors": selectors},
        )
        response.raise_for_status()
        return response.json()

    async def close(self):
        """Close the client"""
        await self.client.aclose()


class UltimateAgent:
    """
    The ultimate 24/7 agent combining:
    - Big Homie's autonomous capabilities
    - Claw Protect's security
    - AgentBrowser's browser automation
    """

    def __init__(self):
        self.claw_protect = ClawProtectClient()
        self.agent_browser = AgentBrowserClient()
        self.action_history: List[Dict[str, Any]] = []
        self.security_log: List[SecurityValidationResult] = []

    async def start(
        self,
        claw_protect_url: str = "http://localhost:3000",
        agent_browser_url: str = "http://localhost:3001",
        api_key: Optional[str] = None,
    ):
        """Initialize all integrations"""
        logger.info("Starting Ultimate Agent...")

        # Connect to Claw Protect (security layer)
        claw_connected = await self.claw_protect.connect(claw_protect_url, api_key)

        # Connect to AgentBrowser (browser layer)
        browser_connected = await self.agent_browser.connect(agent_browser_url)

        logger.info(
            f"Ultimate Agent started - ClawProtect: {claw_connected}, AgentBrowser: {browser_connected}"
        )

        return {"claw_protect": claw_connected, "agent_browser": browser_connected}

    async def execute_secure_action(self, action: AgentAction) -> Dict[str, Any]:
        """
        Execute an action with full security validation
        """
        logger.info(
            f"Executing secure action: {action.action_type} - {action.description}"
        )

        # Step 1: Security validation through Claw Protect
        security_result = await self.claw_protect.validate_action(action)
        self.security_log.append(security_result)

        if not security_result.approved:
            logger.warning(
                f"Action blocked by security: {security_result.blocked_reasons}"
            )
            return {
                "success": False,
                "blocked": True,
                "reasons": security_result.blocked_reasons,
                "risk_level": security_result.risk_level,
            }

        # Step 2: Execute the action based on type
        result = {"success": True}

        if action.action_type == "browser_navigate":
            if self.agent_browser.status == IntegrationStatus.CONNECTED:
                browser_result = await self.agent_browser.browse(
                    url=action.parameters.get("url"),
                    mode=action.parameters.get("mode", "browse"),
                    extract=action.parameters.get("extract"),
                )
                result["browser_data"] = browser_result
            else:
                result["warning"] = "AgentBrowser unavailable, using fallback"

        # Record in history
        self.action_history.append(
            {
                "action": action,
                "security_result": security_result,
                "result": result,
                "timestamp": datetime.now().isoformat(),
            }
        )

        return result

    async def browse_with_security(
        self, url: str, purpose: str = "", use_agent_browser: bool = True
    ) -> Dict[str, Any]:
        """Browse a URL with full security validation"""
        action = AgentAction(
            id=f"browse_{datetime.now().timestamp()}",
            action_type="browser_navigate",
            description=purpose or f"Navigate to {url}",
            parameters={"url": url, "mode": "browse"},
            context={"source": "ultimate_agent"},
        )

        return await self.execute_secure_action(action)

    async def research_with_security(
        self, query: str, depth: int = 3
    ) -> Dict[str, Any]:
        """Research a topic with security validation"""
        action = AgentAction(
            id=f"research_{datetime.now().timestamp()}",
            action_type="research",
            description=f"Research: {query}",
            parameters={"query": query, "depth": depth},
            context={"source": "ultimate_agent"},
        )

        return await self.execute_secure_action(action)

    async def get_status(self) -> Dict[str, Any]:
        """Get overall system status"""
        return {
            "timestamp": datetime.now().isoformat(),
            "claw_protect": {
                "status": self.claw_protect.status.value,
                "security_checks": len(self.security_log),
                "recent_validations": [
                    {"approved": r.approved, "risk_level": r.risk_level}
                    for r in self.security_log[-5:]
                ],
            },
            "agent_browser": {"status": self.agent_browser.status.value},
            "actions_executed": len(self.action_history),
            "security_blocked": sum(1 for r in self.security_log if not r.approved),
        }

    async def close(self):
        """Close all connections"""
        await self.claw_protect.close()
        await self.agent_browser.close()
        logger.info("Ultimate Agent closed")


# Global instance
ultimate_agent = UltimateAgent()


async def start_ultimate_agent(
    claw_protect_url: str = "http://localhost:3000",
    agent_browser_url: str = "http://localhost:3001",
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Start the ultimate agent with all integrations"""
    return await ultimate_agent.start(claw_protect_url, agent_browser_url, api_key)


async def browse_secure(url: str, purpose: str = "") -> Dict[str, Any]:
    """Browse a URL with security validation"""
    return await ultimate_agent.browse_with_security(url, purpose)


async def research_secure(query: str, depth: int = 3) -> Dict[str, Any]:
    """Research with security validation"""
    return await ultimate_agent.research_with_security(query, depth)


async def get_agent_status() -> Dict[str, Any]:
    """Get agent status"""
    return await ultimate_agent.get_status()
