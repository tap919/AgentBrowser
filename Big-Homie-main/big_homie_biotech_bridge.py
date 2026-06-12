"""
BigHomieBiotechBridge - Combo 2: Big Homie + Biotech IDE Controller
Bridges Big Homie autonomous agent to Biotech IDE experiments
"""

import asyncio
import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import sys
from pathlib import Path

OVERLAB_ROOT = Path(__file__).resolve().parent.parent
BIOTECH_IDE_CONTROLLER_PATH = OVERLAB_ROOT / "Overlay Science"
sys.path.insert(0, str(BIOTECH_IDE_CONTROLLER_PATH))

from biotech_ide_controller import (
    BiotechIDEController,
    ExtensionStatus,
    ExperimentStatus,
    ExtensionType,
    ExperimentRequest,
    ExperimentResult,
)

logger = logging.getLogger(__name__)

BIOTECH_IDE_PATH = Path(
    os.environ.get(
        "BIOTECH_IDE_PATH", r"C:\Users\User\Desktop\Overlab\Overlay Science\Biotech IDE"
    )
)


@dataclass
class BigHomieExperimentRequest:
    """Request from Big Homie to run a biotech experiment"""

    task: str
    extension: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    priority: int = 1
    scheduled_for: Optional[str] = None


@dataclass
class BigHomieExperimentResponse:
    """Response from biotech experiment execution"""

    experiment_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    logs: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


@dataclass
class ExtensionRecord:
    """Simplified extension record for Big Homie"""

    id: str
    name: str
    type: str
    status: str
    capabilities: List[str]
    enabled: bool


@dataclass
class SystemStatus:
    """System status for Big Homie"""

    initialized: bool
    extensions: Dict[str, int]
    experiments: Dict[str, int]
    queue_length: int
    timestamp: str


class BigHomieBiotechBridge:
    """Bridge between Big Homie autonomous agent and Biotech IDE Controller"""

    def __init__(self, biotech_ide_path: Path = BIOTECH_IDE_PATH):
        self.controller: Optional[BiotechIDEController] = None
        self.initialized = False
        self.biotech_ide_path = biotech_ide_path

    async def initialize(self) -> bool:
        """Initialize the bridge and Biotech IDE Controller"""
        if self.initialized:
            return True

        try:
            self.controller = BiotechIDEController(self.biotech_ide_path)
            await self.controller.initialize()
            self.initialized = True
            logger.info("[BigHomieBiotechBridge] Initialized successfully")
            return True
        except Exception as e:
            logger.error(f"[BigHomieBiotechBridge] Init failed: {e}")
            return False

    async def list_extensions(self) -> List[ExtensionRecord]:
        """List all available extensions"""
        if not self.controller:
            return []

        extensions = await self.controller.get_extensions()
        return [
            ExtensionRecord(
                id=ext.id,
                name=ext.name,
                type=ext.type.value,
                status=ext.status.value,
                capabilities=ext.capabilities,
                enabled=ext.enabled,
            )
            for ext in extensions
        ]

    async def start_extension(self, extension_id: str) -> bool:
        """Start an extension"""
        if not self.controller:
            return False
        return await self.controller.start_extension(extension_id)

    async def stop_extension(self, extension_id: str) -> bool:
        """Stop an extension"""
        if not self.controller:
            return False
        return await self.controller.stop_extension(extension_id)

    async def run_experiment(
        self, request: BigHomieExperimentRequest
    ) -> BigHomieExperimentResponse:
        """Create and run a biotech experiment"""
        if not self.controller:
            return BigHomieExperimentResponse(
                experiment_id="",
                status="error",
                errors=["Controller not initialized"],
            )

        experiment_id = (
            f"exp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        )

        scheduled = None
        if request.scheduled_for:
            scheduled = datetime.fromisoformat(request.scheduled_for)

        experiment = ExperimentRequest(
            id=experiment_id,
            extension_id=request.extension,
            name=request.task,
            description=request.task,
            parameters=request.parameters,
            priority=request.priority,
            scheduled_for=scheduled,
        )

        try:
            await self.controller.create_experiment(experiment)
            started = await self.controller.run_experiment(experiment_id)

            if started:
                result = await self.controller.get_experiment_result(experiment_id)
                if result:
                    return BigHomieExperimentResponse(
                        experiment_id=experiment_id,
                        status=result.status.value,
                        result=result.results,
                        logs=result.logs,
                        errors=result.errors,
                    )

            return BigHomieExperimentResponse(
                experiment_id=experiment_id,
                status="failed",
                errors=["Failed to start experiment"],
            )
        except Exception as e:
            return BigHomieExperimentResponse(
                experiment_id=experiment_id,
                status="error",
                errors=[str(e)],
            )

    async def find_by_capability(self, capability: str) -> List[ExtensionRecord]:
        """Find extensions by capability"""
        if not self.controller:
            return []

        extensions = await self.controller.get_extensions()
        return [
            ExtensionRecord(
                id=ext.id,
                name=ext.name,
                type=ext.type.value,
                status=ext.status.value,
                capabilities=ext.capabilities,
                enabled=ext.enabled,
            )
            for ext in extensions
            if capability in ext.capabilities
        ]

    async def find_by_type(self, ext_type: ExtensionType) -> List[ExtensionRecord]:
        """Find extensions by type"""
        if not self.controller:
            return []

        extensions = await self.controller.get_extensions()
        return [
            ExtensionRecord(
                id=ext.id,
                name=ext.name,
                type=ext.type.value,
                status=ext.status.value,
                capabilities=ext.capabilities,
                enabled=ext.enabled,
            )
            for ext in extensions
            if ext.type == ext_type
        ]

    async def get_status(self) -> SystemStatus:
        """Get system status"""
        if not self.controller:
            return SystemStatus(
                initialized=False,
                extensions={"total": 0, "running": 0},
                experiments={
                    "total": 0,
                    "queued": 0,
                    "running": 0,
                    "completed": 0,
                    "failed": 0,
                },
                queue_length=0,
                timestamp=datetime.now().isoformat(),
            )

        extensions = await self.controller.get_extensions()
        ext_running = sum(1 for e in extensions if e.status == ExtensionStatus.RUNNING)

        experiments = await self.controller.get_experiment_queue()
        exp_queued = len(experiments)

        return SystemStatus(
            initialized=True,
            extensions={"total": len(extensions), "running": ext_running},
            experiments={
                "total": len(self.controller.experiments),
                "queued": exp_queued,
                "running": len(self.controller.running_experiments),
                "completed": len(
                    [
                        r
                        for r in self.controller.results.values()
                        if r.status == ExperimentStatus.COMPLETED
                    ]
                ),
                "failed": len(
                    [
                        r
                        for r in self.controller.results.values()
                        if r.status == ExperimentStatus.FAILED
                    ]
                ),
            },
            queue_length=len(self.controller.experiment_queue),
            timestamp=datetime.now().isoformat(),
        )

    async def cleanup(self):
        """Cleanup resources"""
        if self.controller:
            await self.controller.cleanup()
            self.initialized = False


_big_homie_biotech_bridge: Optional[BigHomieBiotechBridge] = None


def get_big_homie_bridge() -> BigHomieBiotechBridge:
    """Get singleton bridge instance"""
    global _big_homie_biotech_bridge
    if _big_homie_biotech_bridge is None:
        _big_homie_biotech_bridge = BigHomieBiotechBridge()
    return _big_homie_biotech_bridge
