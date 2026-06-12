"""
langgraph_pipeline.py
─────────────────────
LangGraph-powered stateful agent pipeline for Big Homie.

Nodes:
  plan  →  execute  →  validate  →  report
                    ↘ (high-risk) human_review

The pipeline replaces the naive single-turn LLM call in the WebSocket
chat handler with a proper graph that can pause, branch, and rewind.
"""

from __future__ import annotations

from typing import TypedDict

try:
    from langgraph.graph import StateGraph, END
    from langgraph.checkpoint.memory import MemorySaver
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False


# ── State schema ──────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    """Shared state that flows through every node."""
    user_message: str
    plan: str
    execution_result: str
    validation_result: str
    final_response: str
    risk_level: str          # "low" | "medium" | "high"
    needs_human: bool
    memory_context: str
    iteration: int
    errors: list[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_llm():
    try:
        from llm_gateway import llm, TaskType
        return llm, TaskType
    except Exception:
        return None, None


def _classify_risk(plan: str) -> str:
    plan_lower = plan.lower()
    high_signals = ["delete", "drop", "remove all", "wipe", "format", "rm -rf",
                    "execute code", "deploy to production", "send email", "make payment"]
    med_signals  = ["install", "update", "modify", "write to", "create file",
                    "run script", "api call"]
    for sig in high_signals:
        if sig in plan_lower:
            return "high"
    for sig in med_signals:
        if sig in plan_lower:
            return "medium"
    return "low"


# ── Nodes ─────────────────────────────────────────────────────────────────────

async def plan_node(state: AgentState) -> AgentState:
    """Break the user message into an execution plan."""
    llm, TaskType = _get_llm()
    memory_ctx = state.get("memory_context", "")
    sys_prompt  = (
        "You are Big Homie, an autonomous AI agent. "
        "Your job right now is PLANNING. "
        "Given the user's request (and any memory context), produce a concise numbered plan "
        "of the concrete steps you will take. Be specific. 3-6 steps max.\n\n"
        f"{f'MEMORY CONTEXT: {memory_ctx}' if memory_ctx else ''}"
    )
    if llm:
        try:
            result = await llm.complete(
                [{"role": "system", "content": sys_prompt},
                 {"role": "user",   "content": state["user_message"]}],
                task_type=TaskType.GENERAL,
            )
            plan = result.get("content", "")
        except Exception as e:
            plan = f"(Plan generation failed: {e}) I will answer directly."
    else:
        plan = f"1. Analyse the request: {state['user_message']}\n2. Provide a direct answer."

    risk = _classify_risk(plan)
    return {**state, "plan": plan, "risk_level": risk, "needs_human": risk == "high"}


async def human_review_node(state: AgentState) -> AgentState:
    """Pause point — the front-end checks risk_level and prompts the user."""
    # In production this would use LangGraph's interrupt() mechanism.
    # Here we annotate the state so the WebSocket handler can surface the warning.
    return {**state, "execution_result": "__AWAITING_HUMAN_APPROVAL__"}


async def execute_node(state: AgentState) -> AgentState:
    """Execute the plan using the available tools / LLM."""
    iteration = state.get("iteration", 0) + 1
    llm, TaskType = _get_llm()
    sys_prompt = (
        "You are Big Homie. You have produced a plan and now you must EXECUTE it. "
        "Carry out the plan step by step, reporting what you did at each stage. "
        "If a step requires a tool you don't have, note it and move on.\n\n"
        f"PLAN:\n{state['plan']}"
    )
    if llm:
        try:
            result = await llm.complete(
                [{"role": "system", "content": sys_prompt},
                 {"role": "user",   "content": state["user_message"]}],
                task_type=TaskType.GENERAL,
            )
            execution = result.get("content", "")
        except Exception as e:
            execution = f"Execution error: {e}"
    else:
        execution = f"(No LLM) Would execute plan: {state['plan']}"

    errors = state.get("errors", [])
    return {**state, "execution_result": execution, "errors": errors, "iteration": iteration}


async def validate_node(state: AgentState) -> AgentState:
    """Spot-check the execution result for obvious errors or safety issues."""
    llm, TaskType = _get_llm()
    sys_prompt = (
        "You are a senior engineer reviewing an AI agent's work. "
        "Check the execution result for correctness and safety. "
        "If it looks complete and safe reply VALID. "
        "If there is a problem, reply INVALID: <brief reason>."
    )
    if llm:
        try:
            result = await llm.complete(
                [{"role": "system", "content": sys_prompt},
                 {"role": "user",   "content": state["execution_result"]}],
                task_type=TaskType.GENERAL,
            )
            validation = result.get("content", "VALID")
        except Exception as e:
            validation = f"VALID (validation skipped: {e})"
    else:
        validation = "VALID"

    return {**state, "validation_result": validation}


async def report_node(state: AgentState) -> AgentState:
    """Compose the final user-facing response."""
    llm, TaskType = _get_llm()
    validation_ok = state.get("validation_result", "").strip().upper().startswith("VALID")
    sys_prompt = (
        "You are Big Homie. Compose a clear, concise final response to the user "
        "based on your execution results. Be direct and helpful. "
        f"{'Note: validation passed.' if validation_ok else 'Note: there were validation issues — mention them.'}"
    )
    combined = f"USER REQUEST: {state['user_message']}\n\nEXECUTION RESULT:\n{state['execution_result']}"
    if llm:
        try:
            result = await llm.complete(
                [{"role": "system", "content": sys_prompt},
                 {"role": "user",   "content": combined}],
                task_type=TaskType.GENERAL,
            )
            final = result.get("content", state["execution_result"])
        except Exception:
            final = state["execution_result"]
    else:
        final = state["execution_result"]

    return {**state, "final_response": final}


# ── Router ────────────────────────────────────────────────────────────────────

def route_after_plan(state: AgentState) -> str:
    """Route to human review if risk is high, otherwise execute directly."""
    if state.get("needs_human"):
        return "human_review"
    return "execute"


def route_after_validate(state: AgentState) -> str:
    validation = state.get("validation_result", "VALID")
    if validation.strip().upper().startswith("INVALID") and state.get("iteration", 0) < 2:
        # Retry execution once
        return "execute"
    return "report"


# ── Graph builder ──────────────────────────────────────────────────────────────

def build_graph():
    if not LANGGRAPH_AVAILABLE:
        return None

    memory = MemorySaver()
    g = StateGraph(AgentState)

    g.add_node("plan",         plan_node)
    g.add_node("human_review", human_review_node)
    g.add_node("execute",      execute_node)
    g.add_node("validate",     validate_node)
    g.add_node("report",       report_node)

    g.set_entry_point("plan")
    g.add_conditional_edges("plan",     route_after_plan,     {"human_review": "human_review", "execute": "execute"})
    g.add_edge("human_review", END)                           # pauses — front-end resumes
    g.add_edge("execute",      "validate")
    g.add_conditional_edges("validate", route_after_validate, {"execute": "execute", "report": "report"})
    g.add_edge("report",       END)

    return g.compile(checkpointer=memory)


# Singleton graph (lazy init)
_graph = None

def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


# ── Public API ────────────────────────────────────────────────────────────────

async def run_pipeline(user_message: str, memory_context: str = "", thread_id: str = "default") -> dict:
    """
    Run the full LangGraph pipeline for a user message.
    Returns a dict with keys: final_response, plan, risk_level, needs_human, validation_result
    """
    graph = get_graph()
    if graph is None:
        # Fallback: no LangGraph
        return {
            "final_response": None,
            "plan": "",
            "risk_level": "low",
            "needs_human": False,
            "validation_result": "VALID",
            "langgraph_available": False,
        }

    initial_state: AgentState = {
        "user_message":     user_message,
        "plan":             "",
        "execution_result": "",
        "validation_result":"",
        "final_response":   "",
        "risk_level":       "low",
        "needs_human":      False,
        "memory_context":   memory_context,
        "iteration":        0,
        "errors":           [],
    }

    config = {"configurable": {"thread_id": thread_id}}

    try:
        result = await graph.ainvoke(initial_state, config=config)
        return {
            "final_response":    result.get("final_response") or result.get("execution_result", ""),
            "plan":              result.get("plan", ""),
            "risk_level":        result.get("risk_level", "low"),
            "needs_human":       result.get("needs_human", False),
            "validation_result": result.get("validation_result", ""),
            "langgraph_available": True,
        }
    except Exception as e:
        return {
            "final_response":    f"Pipeline error: {e}",
            "plan":              "",
            "risk_level":        "low",
            "needs_human":       False,
            "validation_result": "ERROR",
            "langgraph_available": True,
        }
