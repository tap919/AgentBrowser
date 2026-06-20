# AgentBrowser Integration Design — Big-Homie + mem0 + nanobot via VibeServe

## Overview

Wire Big-Homie's Python backend (LLM gateway, vector memory, 12 integrations), mem0 (semantic memory), and nanobot (multi-channel communication) into AgentBrowser through VibeServe's existing MCP infrastructure. Each backend becomes a set of MCP tools registered on VibeServe's FastMCP server.

## Architecture

```
AgentBrowser (Next.js, port 3005)
    │
    │ MCP protocol (HTTP)
    ▼
VibeServe (FastMCP, port 8000)
    │
    ├── big-homie-mcp
    │   ├── llm_complete()        — Multi-provider LLM routing
    │   ├── memory_search()       — Vector memory search
    │   ├── memory_store()        — Vector memory store
    │   ├── stripe_*()            — Stripe payment tools
    │   ├── shopify_*()           — Shopify order tools
    │   ├── binance_*()           — Binance price tools
    │   ├── twilio_send_sms()     — Twilio SMS
    │   ├── coinbase_*()          — Coinbase commerce
    │   ├── plaid_*()             — Plaid financial data
    │   ├── cloudflare_*()        — Cloudflare management
    │   ├── google_cloud_*()      — GCP operations
    │   ├── vercel_*()            — Vercel deployment
    │   ├── perplexity_search()   — Perplexity AI search
    │   ├── draftkings_*()        — DraftKings data
    │   ├── prizepicks_*()        — PrizePicks data
    │   ├── governance_check_budget()  — Budget enforcement
    │   └── governance_kill_switch()   — Agent shutdown
    │
    ├── mem0-mcp
    │   ├── mem0_add()            — Store memory
    │   ├── mem0_search()         — Semantic search
    │   ├── mem0_get_all()        — List memories
    │   ├── mem0_delete()         — Delete memory
    │   └── mem0_graph_query()    — Knowledge graph query
    │
    └── nanobot-mcp
        ├── nanobot_send()            — Multi-channel send
        ├── nanobot_schedule_cron()   — Cron job registration
        ├── nanobot_run_skill()       — Skill execution
        └── nanobot_list_skills()     — List available skills
```

## File Structure (inside VibeServe)

```
VibeServe-main/vibeserve/
├── integrations/
│   ├── __init__.py
│   ├── big_homie_mcp.py     # LLM, memory, governance, integrations
│   ├── mem0_mcp.py          # Vector search, graph memory
│   └── nanobot_mcp.py       # Multi-channel, cron, skills
├── __main__.py              # Modified: imports integrations
└── pyproject.toml           # Modified: optional deps
```

## Dependencies

- `big-homie` — local path to `Documents/Projects/Big-Homie-main`
- `mem0` — `pip install mem0`
- `nanobot-ai` — `pip install nanobot-ai`

## Backend-Specific Notes

### Big-Homie
Located at `C:\Users\User\Documents\Projects\Big-Homie-main`. Imports:
- `llm_gateway.py` — `llm.complete_with_tools()`
- `vector_memory.py` — `vector_memory.search_conversations()`, `add_conversation()`
- `integrations/stripe_integration.py`, `shopify_integration.py`, etc.
- `governance.py` — budget checks, kill switch
- `cost_guards.py` — per-request cost tracking

Each integration class is instantiated with config from `.env`, then exposed as `@mcp.tool()` functions.

### mem0
Installed via pip. Uses `MemoryClient` for API access or directly imports `mem0.memory.main.Memory`. Supports:
- 17 vector store backends (default: Chroma or PGVector)
- 14 embedding providers (default: OpenAI or Ollama)
- Graph memory for entity-relationship queries

### nanobot
Installed via pip (`nanobot-ai`). Uses:
- `nanobot.channels.manager` — multi-channel send
- `nanobot.cron.service` — cron job management
- `nanobot.skills.loader` — skill execution

## MCP Registration Pattern

Each integration file follows this template:

```python
from vibeserve.server import mcp

# Big-Homie example
try:
    from big_homie.llm_gateway import llm, TaskType
    HAS_BIG_HOMIE = True
except ImportError:
    HAS_BIG_HOMIE = False

@mcp.tool()
async def llm_complete(prompt: str, task_type: str = "general") -> str:
    if not HAS_BIG_HOMIE:
        return "big-homie not installed"
    response = await llm.complete_with_tools(
        messages=[{"role": "user", "content": prompt}],
        task_type=TaskType.GENERAL
    )
    return response["content"]
```

Graceful fallback when a backend isn't installed — tools return an error message instead of crashing VibeServe.

## Phase 2 (Future)

- Content-Creation-Engine MCP tools (book-to-video pipelines)
- Aetherdesk MCP tools (voice call triggers)
- AutoResearchClaw MCP tools (literature search, experiment sandboxes)
- GemmaDesktop MCP tools (local inference fallback)

## Testing

- Each integration file has independent test coverage
- VibeServe's existing test suite continues to pass
- Integration tests verify MCP tool registration and basic invocation
- Fallback tests verify graceful degradation when backends are missing
