"""
AlphaEngine HTTP Server - Combo 3 Integration
Wraps AlphaEngine Python class as REST API for BlackMind integration
"""

import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, Optional

# Add AlphaEngine path
WORKFORCE_ROOT = Path(__file__).resolve().parent.parent
ALPHA_ENGINE_PATH = WORKFORCE_ROOT / "AlphaEngine"
sys.path.insert(0, str(ALPHA_ENGINE_PATH))

from alpha_engine import AlphaEngine, get_alpha_engine, ALLOWED_CAPABILITIES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
PORT = int(os.environ.get("ALPHA_ENGINE_PORT", "5000"))
HOST = os.environ.get("ALPHA_ENGINE_HOST", "0.0.0.0")


class ExecuteRequest(BaseModel):
    capability: str
    params: Dict[str, Any] = {}


class ExecuteResponse(BaseModel):
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DailyBriefRequest(BaseModel):
    market_scope: str = "broad"
    subscriber_tier: str = "pro"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AlphaEngine HTTP Server starting...")
    engine = get_alpha_engine()
    logger.info(f"AlphaEngine initialized - available backends: {engine.available}")
    yield
    logger.info("AlphaEngine HTTP Server shutting down...")


app = FastAPI(
    title="AlphaEngine API",
    description="Unified financial intelligence across stocks, strategy simulation, and sports betting",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    engine = get_alpha_engine()
    return {
        "status": "healthy",
        "available_backends": engine.available,
        "allowed_capabilities": list(ALLOWED_CAPABILITIES),
    }


@app.post("/execute", response_model=ExecuteResponse)
async def execute_capability(request: ExecuteRequest):
    """Execute a capability via AlphaEngine"""
    if request.capability not in ALLOWED_CAPABILITIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid capability. Allowed: {list(ALLOWED_CAPABILITIES)}",
        )

    engine = get_alpha_engine()
    backend = engine.route(request.capability)

    if not backend:
        raise HTTPException(
            status_code=503,
            detail=f"No available backend for capability: {request.capability}",
        )

    try:
        result = await engine.execute(request.capability, request.params)
        return ExecuteResponse(success=True, result=result)
    except Exception as e:
        logger.error(f"Execution error: {e}")
        return ExecuteResponse(success=False, error=str(e))


@app.get("/capabilities")
async def list_capabilities():
    """List all available capabilities"""
    engine = get_alpha_engine()
    return {
        "capabilities": list(ALLOWED_CAPABILITIES),
        "backend_mapping": engine.CAPABILITIES,
        "available_backends": engine.available,
    }


@app.post("/daily-brief")
async def daily_brief(request: DailyBriefRequest):
    """Get the daily alpha brief across all backends"""
    engine = get_alpha_engine()
    try:
        brief = await engine.daily_brief(
            market_scope=request.market_scope,
            subscriber_tier=request.subscriber_tier,
        )
        return {"success": True, "brief": brief}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/backends")
async def list_backends():
    """List all available backends and their status"""
    engine = get_alpha_engine()
    return {
        "backends": engine.BACKEND_DIRS,
        "available": engine.available,
    }


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting AlphaEngine HTTP Server on {HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT)
