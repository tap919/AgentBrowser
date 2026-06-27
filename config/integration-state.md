# Integration State

Last updated: 2026-06-15 (post-Phase 8 polish).

## Service Directory Mapping

| Service | Directory | Language | Entry Point | Status |
|---------|-----------|----------|-------------|--------|
| AgentBrowser | `src/` | TypeScript / Next.js | `npm run dev` (port 3000) | All 8 phases complete |
| Big Homie | `Big-Homie-main/` | Python / FastAPI | `uvicorn big_homie_web:app --port 8888` | LLM gateway + `/llm/complete` bridge |
| Claw Protect | `Claw-Protect-main/` | TypeScript / Express | `npm run dev` (port 3333) | Security gate wired, fail-closed |
| Mutly | `Mutly-Daemon-Agent/` | TypeScript / Express + Vite | `npm run dev` (API 4000, WS 24678) | Typed client, pipeline/status routes |
| VibeServe | `VibeServe-main/` | Python / MCP router | `python -m vibeserve` (port 8000) | Typed client, Big Homie LLM bridge |
| RepoRank | `reporank/` | TypeScript / pnpm workspace | `pnpm dev` (API 3001, web 5173) | Typed client, analyze/status routes |

## Port Assignments

| Port | Service | Protocol | Notes |
|------|---------|----------|-------|
| 3000 | AgentBrowser | HTTP | Next.js frontend + API routes |
| 3001 | RepoRank API | HTTP | Analysis + scan status |
| 3002 | VibeServe Orchestrator | HTTP | Hono API (Node.js) |
| 3005 | VibeServe IDE | HTTP | React/Vite dev server |
| 3333 | Claw Protect | HTTP | Security service API |
| 4000 | Mutly API | HTTP | Daemon REST API |
| 5173 | RepoRank Web | HTTP | RepoRank UI |
| 8000 | VibeServe MCP | HTTP | Python MCP + `/llm/complete` delegated queries via Big Homie bridge |
| 8888 | Big Homie | HTTP + WS | FastAPI + `/ws` + `/llm/complete` |
| 24678 | Mutly | WS | WebSocket server for agent clients |

## Environment Variable Contracts

### AgentBrowser `.env`

```env
AGENT_API_KEY=                   # server-side; must match MUTLY_API_KEY
NEXT_PUBLIC_AGENT_API_KEY=       # client-side; must match MUTLY_API_KEY
DATABASE_URL=file:./dev.db
PORT=3000
NEXT_PUBLIC_BIG_HOMIE_URL=http://localhost:8888
NEXT_PUBLIC_BIG_HOMIE_WS_URL=ws://localhost:8888/ws
NEXT_PUBLIC_CLAW_PROTECT_URL=http://localhost:3333
CLAW_PROTECT_URL=http://localhost:3333
CLAW_PROTECT_API_KEY=
MUTLY_URL=http://localhost:4000
VIBESERVE_URL=http://localhost:8000
VIBESERVE_API_KEY=
REPORANK_URL=http://localhost:3001
REPORANK_API_KEY=
NEXT_PUBLIC_N8N_URL=http://localhost:5678
DISABLE_HEALTH_CHECK_CRON=       # set to 'true' to suppress periodic health checks
```

### Big Homie `.env`

```env
SERVER_HOST=127.0.0.1
SERVER_PORT=8888
ORCHESTRATOR_SECRET=             # production only
USE_CLAW_PROTECT=false
CLAW_PROTECT_URL=http://localhost:3333
CLAW_PROTECT_API_KEY=
AGENT_BROWSER_URL=http://localhost:3000
```

### Claw Protect `.env`

```env
CLAW_PORT=3333
CLAW_PROTECT_API_KEY=            # must match AgentBrowser CLAW_PROTECT_API_KEY
CLAW_SERVE_SAAS=false
GEMINI_API_KEY=
```

### Mutly `.env`

```env
PORT=4000
MUTLY_WS_PORT=24678
MUTLY_API_KEY=                   # must match AgentBrowser AGENT_API_KEY
ENABLE_VIBESERVE_MCP=true
VIBESERVE_MCP_URL=http://127.0.0.1:8000
VIBESERVE_API_KEY=
REPORANK_ENABLED=true
REPORANK_API_URL=http://localhost:3001
REPORANK_API_KEY=
```

### VibeServe `.env`

```env
VIBESERVE_API_SECRET=            # required for production
VIBESERVE_API_KEY=
DEFAULT_LLM_PROVIDER=opencode    # first choice: big-homie → gemini → openai → deepseek → ...
BIG_HOMIE_URL=http://localhost:8888   # if set, BigHomieProvider registered (delegates LLM to Big Homie)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4-turbo-preview
```

## Integration Matrix (current state)

| AgentBrowser Action | Big Homie | Claw Protect | Mutly | VibeServe | RepoRank | Local Fallback |
|---------------------|-----------|--------------|-------|-----------|----------|----------------|
| Run agent skill | `bigHomie.executeSkill()` | `securityMiddleware.validateAction()` | — | — | — | `runPresetAgentAsync()` |
| Chat with LLM | WS + `/execute` | prompt injection scan | — | — | — | template fallback in llm_gateway |
| Build project | — | — | `mutlyClient.startPipeline()` | `callVibeServeTool()` | — | — |
| Analyze repo | — | — | — | — | `analyzeRepo()` | — |
| Health check | `/tools/status` | `checkClawProtectHealth()` | `checkMutlyHealth()` | `checkVibeServeHealth()` | `checkReporankHealth()` | `/api/system/health` |
| LLM completion | `/llm/complete` | — | — | BigHomieProvider bridge | — | VibeServe's local provider chain |
| Security gate | — | hard stop (fail-closed) | — | — | — | keyword detection |
| Self-healing | reconnect + backoff | fail-closed is self-protecting | health poll | Mutly proxy fallback | health poll | cron scheduler |

## LLM Routing Architecture

VibeServe and Big Homie each have independent LLM routing systems. The X8 bridge connects them:

- **Big Homie** (`llm_gateway.py`): Native Anthropic SDK, OpenAI SDK, HuggingFace, OpenRouter, Ollama, Copilot. Routes by task type (REASONING/CODING/FAST/GENERAL).
- **VibeServe** (`vibeserve/providers/`): OpenAI, DeepSeek, OpenRouter, Gemini, OllamaCloud, Local, OpenCode CLI, Mock. Routes by complexity (simple/medium/complex/critical).
- **Bridge** (`BigHomieProvider`): When `BIG_HOMIE_URL` is set, VibeServe registers a provider that delegates to Big Homie's `/llm/complete` endpoint. This avoids duplicating LLM provider config across two systems.

## Verified Baseline

- [x] `npx tsc --noEmit` in `src/` — pass
- [x] `npx tsc --noEmit` in `Mutly-Daemon-Agent/` — pass (Vite type conflict pre-existing)
- [x] `python -m py_compile Big-Homie-main/*.py` — pass
- [x] `python -m py_compile VibeServe-main/vibeserve/*.py` — pass
