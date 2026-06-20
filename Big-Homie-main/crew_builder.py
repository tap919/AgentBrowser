"""
crew_builder.py
───────────────
CrewAI multi-agent crew for Ultimate Agent pipeline execution.

Maps the 7 build phases to a specialized CrewAI crew:
  Researcher → Architect → Coder → Tester → Auditor → Deployer → Reporter

Falls back gracefully when crewai is not installed.
"""

from __future__ import annotations

import os

CREWAI_AVAILABLE = False
try:
    from crewai import Agent, Crew, Task, Process
    CREWAI_AVAILABLE = True
except ImportError:
    pass


# ── LLM shim ─────────────────────────────────────────────────────────────────

def _get_crewai_llm():
    """Return a LangChain-compatible LLM for CrewAI to use."""
    try:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet"),
            api_key=os.getenv("OPENROUTER_API_KEY", "sk-no-key"),
            base_url=os.getenv("OPENROUTER_ENDPOINT", "https://openrouter.ai/api/v1"),
            temperature=0.3,
        )
    except ImportError:
        return None


# ── Agent definitions ─────────────────────────────────────────────────────────

def make_agents(llm):
    """Create the 7 specialist agents for Ultimate Agent's build pipeline."""
    base = dict(llm=llm, verbose=False, allow_delegation=False, max_iter=3)

    researcher = Agent(
        role="Senior Research Analyst",
        goal="Gather comprehensive information about the project domain, competitors, and best practices.",
        backstory="Expert at synthesising large amounts of information quickly into actionable insights.",
        **base,
    )
    architect = Agent(
        role="Software Architect",
        goal="Design a robust, scalable technical architecture for the project.",
        backstory="10 years designing distributed systems. Prioritises simplicity and correctness.",
        **base,
    )
    coder = Agent(
        role="Senior Full-Stack Engineer",
        goal="Write clean, production-quality implementation code for the designed architecture.",
        backstory="Expert in TypeScript, Python, and modern web frameworks. TDD advocate.",
        **base,
    )
    tester = Agent(
        role="QA Engineer",
        goal="Write comprehensive tests and surface edge cases and failure modes.",
        backstory="Thinks like an attacker. Finds bugs others miss. Writes clear test reports.",
        **base,
    )
    auditor = Agent(
        role="Security Auditor",
        goal="Review all code and configuration for security vulnerabilities and compliance issues.",
        backstory="OWASP expert. Has prevented multiple critical vulnerabilities in production systems.",
        **base,
    )
    deployer = Agent(
        role="DevOps Engineer",
        goal="Plan and execute a safe, reliable deployment strategy.",
        backstory="Specialises in CI/CD, Docker, and zero-downtime deployments.",
        **base,
    )
    reporter = Agent(
        role="Technical Writer",
        goal="Produce a clear, comprehensive final report of all work done.",
        backstory="Translates complex technical output into readable documentation for any audience.",
        **base,
    )

    return researcher, architect, coder, tester, auditor, deployer, reporter


# ── Task factory ───────────────────────────────────────────────────────────────

def make_tasks(project_name: str, project_desc: str, agents):
    researcher, architect, coder, tester, auditor, deployer, reporter = agents

    t1 = Task(
        description=f"Research the domain, technology options, and best practices for: {project_desc}. Produce a research brief.",
        expected_output="A structured research brief with technology recommendations and market context.",
        agent=researcher,
    )
    t2 = Task(
        description=f"Using the research brief, design the full technical architecture for {project_name}. Include data models, API design, and component diagram.",
        expected_output="Architecture document with stack choices, component list, and data flow diagram.",
        agent=architect,
    )
    t3 = Task(
        description=f"Implement the core modules for {project_name} based on the architecture. Write the key files and functions.",
        expected_output="Implementation plan with actual code snippets for the most critical components.",
        agent=coder,
    )
    t4 = Task(
        description=f"Create a comprehensive test plan for {project_name}. Include unit, integration, and E2E test cases.",
        expected_output="Test plan with test cases, edge cases, and suggested framework.",
        agent=tester,
    )
    t5 = Task(
        description=f"Audit the implementation for {project_name} for OWASP Top 10 vulnerabilities and security best practices.",
        expected_output="Security report with findings, risk levels, and remediation recommendations.",
        agent=auditor,
    )
    t6 = Task(
        description=f"Create a deployment plan for {project_name} including CI/CD pipeline, environment config, and rollback strategy.",
        expected_output="Deployment runbook with step-by-step instructions and rollback procedures.",
        agent=deployer,
    )
    t7 = Task(
        description=f"Compile all outputs into a final project report for {project_name} including executive summary, architecture, implementation plan, test results, security findings, and deployment guide.",
        expected_output="Complete project report in markdown format.",
        agent=reporter,
    )

    return [t1, t2, t3, t4, t5, t6, t7]


# ── Public API ─────────────────────────────────────────────────────────────────

def run_crew(project_name: str, project_desc: str, skill: str = "") -> dict:
    """
    Synchronously run the CrewAI pipeline for a project.
    Returns a dict with status and result.
    """
    if not CREWAI_AVAILABLE:
        return {
            "status": "unavailable",
            "message": "crewai not installed. Run: pip install crewai langchain-openai",
            "result": "",
        }

    llm = _get_crewai_llm()
    if llm is None:
        return {
            "status": "error",
            "message": "langchain_openai not installed. Run: pip install langchain-openai",
            "result": "",
        }

    try:
        agents = make_agents(llm)
        tasks  = make_tasks(project_name, project_desc, agents)

        # If a single skill was requested, only run the relevant task
        skill_map = {
            "research":   [0],
            "architect":  [1],
            "code":       [2],
            "test":       [3],
            "audit":      [4],
            "deploy":     [5],
            "report":     [6],
        }
        selected = skill_map.get((skill or "").lower(), list(range(len(tasks))))
        selected_tasks  = [tasks[i]  for i in selected]
        # Deduplicate agents by role (Agent objects may not be hashable)
        seen_roles: set[str] = set()
        selected_agents = []
        for i in selected:
            agent = tasks[i].agent
            if agent.role not in seen_roles:
                seen_roles.add(agent.role)
                selected_agents.append(agent)

        crew = Crew(
            agents=selected_agents,
            tasks=selected_tasks,
            process=Process.sequential,
            verbose=False,
        )

        result = crew.kickoff()
        return {
            "status": "success",
            "result": str(result),
            "agents_used": [a.role for a in selected_agents],
        }

    except Exception as e:
        return {"status": "error", "message": str(e), "result": ""}
