# AgentBrowser

This is a multi-service autonomous agent system (AgentBrowser, Big Homie, Claw Protect, Mutly, VibeServe, RepoRank).

## Mandatory Protocol — READ BEFORE EVERY SESSION

**⚠️ WARNING — ENFORCEMENT ACTIVE**

Previous LLM sessions have been caught fabricating fixes: claiming code was changed when files were untouched, fabricating verification output, and skipping required steps. This protocol closes those loopholes.

### Three files you MUST read and follow:

1. **`AGENT-PROTOCOL.md`** — The Five Gates. Every fix must pass all 5 gates.
2. **`ENFORCE-FIX-PROTOCOL.md`** — Anti-bullshit enforcement rules. Gate 1 + Gate 5 proof is MANDATORY for every single fix. No exceptions.
3. **`verify-audit-fixes.ps1`** — The only truth. This script independently checks every fix. **Do not claim a fix is done unless this script passes for that check.**

### Session flow (NOT optional):

1. Run `.\verify-audit-fixes.ps1` to see current state
2. For each FAIL: produce Gate 1 evidence
3. Apply the fix
4. Produce Gate 5 evidence (undo the Gate 1 proof)
5. Re-run `.\verify-audit-fixes.ps1`
6. Commit with message referencing Gate 1 + Gate 5

### If you get caught fabricating:

If the verification script reveals a fix was not actually applied, or `git diff` shows no changes for files you claimed to edit, admit the fabrication immediately, re-read the actual file state, apply the real fix, and run verification. Do not make excuses.

For the current roadmap, see `docs/agentbrowser-finalization.md`.

### Fix Priority (from deep audit)

| Priority | Issue | File | Verify Check |
|----------|-------|------|-------------|
| P0 | Hardcoded Gemini API key | `reporank/.env` | p0-gemini-api-key-removed |
| P0 | Hardcoded GitHub OAuth | `reporank/.env` | p0-github-oauth-* |
| P0 | Hardcoded Firebase key | `Claw-Protect-main/firebase-applet-config.json` | p0-firebase-api-key-removed |
| P0 | Caddyfile open proxy SSRF | `Caddyfile` | p0-caddyfile-no-open-proxy |
| P1 | Auth bypass (GET skips auth) | `src/lib/api-auth-middleware.ts` | p1-auth-middleware-no-get-bypass |
| P1 | Missing auth on 14+ routes | `src/app/api/*/route.ts` | p1-*-has-auth |
| P1 | SQL injection in Big Homie | `Big-Homie-main/database_ops.py` | p1-big-homie-sql-injection-fixed |
| P1 | Custom XOR credential crypto | `src/lib/credentials.ts` | p1-credentials-* |
| P1 | NEXT_PUBLIC secret exposure | `.env` | p1-no-next-public-api-key |
| P1 | Weak crypto (Math.random/base64) | `Claw-Protect-main/.../agentIdentityManager.ts` | p1-claw-* |
| P2 | Docker runs as root | `Dockerfile` | p2-dockerfile-has-user |
| P2 | Race conditions | `src/lib/browser-controller.ts` | p2-browser-controller-* |
| P2 | prisma --accept-data-loss | `reporank/docker-entrypoint.sh` | p2-prisma-no-* |

## Project Layout

- `src/` — AgentBrowser (Next.js)
- `Big-Homie-main/` — Big Homie (Python FastAPI + LLM orchestration)
- `Claw-Protect-main/` — Claw Protect (Express + security modules)
- `Mutly-Daemon-Agent/` — Mutly (Express + Vite + agent pipeline)
- `VibeServe-main/` — VibeServe (Python MCP provider router)
- `RepoRank-main/` — RepoRank (Python repo analysis)
- `config/` — shared configuration (fallback matrix, port registry)

## Verification Commands

```bash
# TypeScript (AgentBrowser)
npx tsc --noEmit

# TypeScript (Mutly)  
cd Mutly-Daemon-Agent && npx tsc --noEmit

# Python
python -m py_compile Big-Homie-main/<file>.py
```

## Commit Convention

- One fix per commit
- Commit message references the Gate 1 evidence
- No "fix fix fix" commits
