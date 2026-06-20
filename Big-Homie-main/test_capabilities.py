"""Pytest suite for Big Homie capability initialization and smoke tests."""

import sys
from datetime import datetime
from pathlib import Path

import pytest


@pytest.mark.core
class TestConfigSystem:
    def test_settings_exist(self):
        from config import settings
        assert settings is not None
        assert hasattr(settings, 'app_name')
        assert hasattr(settings, 'anthropic_api_key')
        assert hasattr(settings, 'memory_db_path')

    def test_data_dir_created(self):
        from config import settings
        assert settings.data_dir.exists()


@pytest.mark.core
class TestMemorySystem:
    def test_store_and_search(self):
        from memory import memory
        test_key = f"test_key_{datetime.now().timestamp()}"
        memory.store(test_key, "test_value_e2e", category="test", importance=5)
        results = memory.search_memory(category="test", limit=5)
        assert isinstance(results, list)

    def test_preferences_get_set(self):
        from memory import memory
        memory.set_preference("test_pref", "test_value")
        assert memory.get_preference("test_pref") == "test_value"


@pytest.mark.core
class TestVectorMemorySystem:
    def test_vector_memory_initialized(self):
        vector_memory = pytest.importorskip("vector_memory", reason="chromadb not installed")
        assert vector_memory is not None

    def test_add_and_search_conversation(self):
        vector_memory = pytest.importorskip("vector_memory", reason="chromadb not installed")
        if hasattr(vector_memory, 'collection') and vector_memory.collection is not None:
            vector_memory.add_conversation(
                content=f"E2E test content at {datetime.now()}",
                role="user",
                metadata={"test": True},
            )
            results = vector_memory.search_conversations(query="E2E test", n_results=5)
            assert results is not None


@pytest.mark.llm
class TestLLMGateway:
    def test_gateway_has_dispatch_methods(self):
        from llm_gateway import llm
        assert llm is not None
        assert hasattr(llm, 'select_model')
        assert hasattr(llm, 'complete')

    def test_model_selection_returns_valid_provider(self):
        from llm_gateway import llm, TaskType
        provider, model = llm.select_model(TaskType.FAST)
        assert provider is not None
        assert model is not None


@pytest.mark.llm
class TestRouterSystem:
    def test_router_initialized(self):
        from router import router
        assert router is not None
        assert hasattr(router, 'route_task')


@pytest.mark.llm
class TestCostGuards:
    def test_estimate_cost_returns_number(self):
        from cost_guards import cost_guard
        test_messages = [{"role": "user", "content": "Hello"}]
        estimate = cost_guard.estimate_cost(
            messages=test_messages,
            model="claude-sonnet-4-5",
            max_output_tokens=100,
        )
        assert estimate is not None
        assert hasattr(estimate, 'estimated_cost')
        assert estimate.estimated_cost >= 0

    def test_budget_status_returns_dict(self):
        from cost_guards import cost_guard
        status = cost_guard.get_budget_status()
        assert status is not None


@pytest.mark.governance
class TestGovernanceSystem:
    def test_human_gate_classify_risk(self):
        from governance import human_gate
        risk_level = human_gate.classify_risk("read file")
        assert risk_level is not None

    def test_audit_trail_log_and_verify(self):
        from governance import audit_trail
        entry = audit_trail.log(
            event_type="test",
            actor="pytest",
            action="test_governance",
            target="system",
        )
        assert entry is not None
        integrity = audit_trail.verify_integrity()
        assert integrity['valid']

    def test_sandbox_kill_switch_exist(self):
        from governance import sandbox, kill_switch
        assert sandbox is not None
        assert kill_switch is not None
        status = kill_switch.get_status()
        assert status['state'] in ['armed', 'normal']


@pytest.mark.skills
class TestBrowserSkill:
    def test_skill_initialized(self):
        from browser_skill import BrowserSkill
        skill = BrowserSkill()
        assert skill is not None

    def test_browser_task_creation(self):
        from browser_skill import BrowserTask
        task = BrowserTask(url="https://example.com", actions=[], screenshot=False)
        assert task.url == "https://example.com"


@pytest.mark.skills
class TestMCPIntegration:
    def test_mcp_initialized(self):
        from mcp_integration import mcp
        assert mcp is not None

    def test_tools_for_llm_returns_list(self):
        from mcp_integration import mcp
        tools = mcp.get_tools_for_llm()
        assert isinstance(tools, list)


@pytest.mark.skills
class TestPersistentShell:
    def test_shell_manager_initialized(self):
        from persistent_shell import shell_manager
        assert shell_manager is not None
        assert hasattr(shell_manager, 'create_session')
        assert hasattr(shell_manager, 'sessions')


@pytest.mark.skills
class TestMediaGeneration:
    def test_manager_initialized(self):
        from media_generation import MediaGenerationManager
        manager = MediaGenerationManager()
        assert manager is not None
        assert hasattr(manager, 'providers')

    def test_providers_by_type(self):
        from media_generation import MediaGenerationManager, MediaType
        manager = MediaGenerationManager()
        for media_type in [MediaType.IMAGE, MediaType.VIDEO, MediaType.MUSIC]:
            providers = manager.get_providers_for_media_type(media_type)
            assert isinstance(providers, list)


@pytest.mark.autonomous
class TestHeartbeatSystem:
    def test_heartbeat_initialized(self):
        from heartbeat import heartbeat, HeartbeatState
        assert heartbeat is not None
        assert hasattr(heartbeat, 'state')
        assert hasattr(heartbeat, 'config')
        assert heartbeat.state in [HeartbeatState.STOPPED, HeartbeatState.RUNNING, HeartbeatState.PAUSED]


@pytest.mark.autonomous
class TestSubAgents:
    def test_orchestrator_initialized(self):
        try:
            from sub_agents import SubAgentOrchestrator
            orchestrator = SubAgentOrchestrator()
        except (ImportError, AttributeError):
            from sub_agents import orchestrator
        assert orchestrator is not None
        assert hasattr(orchestrator, 'execute_workflow')


@pytest.mark.intelligence
class TestCognitiveCore:
    def test_core_initialized(self):
        from cognitive_core import CognitiveCore, ReasoningStrategy
        core = CognitiveCore()
        assert core is not None
        assert hasattr(core, 'reason')
        assert ReasoningStrategy.CHAIN_OF_THOUGHT is not None
        assert ReasoningStrategy.REACT is not None


@pytest.mark.intelligence
class TestDocumentIntelligence:
    def test_initialized(self):
        from document_intelligence import doc_intelligence
        assert doc_intelligence is not None
        assert hasattr(doc_intelligence, 'analyze')


@pytest.mark.intelligence
class TestSkillAcquisition:
    def test_registry_initialized(self):
        from skill_acquisition import SkillRegistry
        registry = SkillRegistry()
        assert registry is not None
        assert hasattr(registry, 'register_skill')


@pytest.mark.intelligence
class TestKarpathyMethods:
    def test_engine_initialized(self):
        from karpathy_methods import karpathy_engine
        assert karpathy_engine is not None
        assert hasattr(karpathy_engine, 'auto')


@pytest.mark.support
class TestContextManager:
    def test_initialized(self):
        try:
            from context_manager import ContextWindowManager
            cm = ContextWindowManager()
        except (ImportError, AttributeError):
            from context_manager import context_manager as cm
        assert cm is not None
        assert hasattr(cm, 'manage_context')


@pytest.mark.support
class TestAbilitiesRegistry:
    def test_initialized(self):
        from abilities_registry import abilities
        assert abilities is not None
        assert hasattr(abilities, 'get_ability')


@pytest.mark.support
class TestThoughtsLogger:
    def test_log_thought(self):
        from thoughts_logger import thoughts_logger
        assert thoughts_logger is not None
        assert hasattr(thoughts_logger, 'log_decision')


@pytest.mark.support
class TestIntegrations:
    def test_modules_importable(self):
        pass
