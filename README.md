# AgentBrowser

Multi-service autonomous agent orchestration platform. AgentBrowser is the central orchestrator that integrates with Big Homie (agent backend), Claw Protect (security), Mutly (build pipeline), VibeServe (MCP tools), and RepoRank (repo analysis).

## Architecture

```
AgentBrowser :3000  ←── orchestrator, scheduler, event bus
  ├── Big Homie :8888       — LLM agent backend (Python/FastAPI)
  ├── Claw Protect :3333    — Security scanning (Express)
  ├── Mutly :4000 /    — Build pipeline daemon (Express)
  │       WS:24678                   
  ├── VibeServe :8000       — MCP tool router (Python)
  └── RepoRank :3001        — Repo analysis (Express)
```

All component integrations have deterministic fallback configured in `config/deterministic-fallback.json`.

## Quickstart

```bash
# AgentBrowser
npm install
npm run dev          # http://localhost:3000
```

### Services

Each service is in its own directory with its own start command:

| Service | Directory | Start |
|---------|-----------|-------|
| Big Homie | `Big-Homie-main/` | `uvicorn big_homie_web:app` |
| Claw Protect | `Claw-Protect-main/` | `npm run dev` |
| Mutly | `Mutly-Daemon-Agent/` | `npm run dev` |
| VibeServe | `VibeServe-main/` | `python -m vibeserve` |
| RepoRank | `reporank/` | See `reporank/SETUP.md` |

### Environment

Copy `.env.example` to `.env` for AgentBrowser. Each service has its own `.env.example`.

### Verification

```bash
npx tsc --noEmit                          # TypeScript
python -m py_compile Big-Homie-main/*.py  # Python syntax
```

## Plan

See `docs/agentbrowser-finalization.md` for the integration roadmap.

## License

MIT
