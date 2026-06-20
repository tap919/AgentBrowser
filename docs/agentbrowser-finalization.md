# AgentBrowser Finalization Plan

## Non-Negotiable Rules (Read Before Every Session)

1. **No code without a numbered task.** If it isn't in this plan, don't do it.
2. **Every task passes Gate 1.** Prove the gap exists before building the bridge.
3. **Check all callers before any API change.** `grep -r` is mandatory.
4. **One integration per phase.** Do not start phase N+1 until phase N is verified.
5. **Verify at every checkpoint.** `tsc --noEmit` and the phase's verification command must pass before continuing.
6. **Human gate at phase boundaries.** The agent stops and summarizes; the user says go/no-go.

---

## What "Fully Uses All Components" Means

AgentBrowser must be able to dispatch work to, receive results from, and gracefully degrade around every subsystem:

| Component | Current State | Final State |
|-----------|--------------|-------------|
| **Big Homie** | WS chat + skill execution in scheduler | First-class skill router with health check, fallback, result streaming |
| **Claw Protect** | Security middleware scans actions | Pre-flight scan on every agent action + pipeline node + user prompt |
| **Mutly** | Not integrated | Build pipeline trigger + status polling + artifact retrieval |
| **VibeServe** | Proxied through Mutly | Direct tool call capability with routing fallback |
| **RepoRank** | Not integrated | Repo analysis trigger + score/report display |
| **AgentBrowser Local** | Scheduler + orchestrator + memory + event bus | Deterministic fallback matrix honored everywhere |

---

## Phase Plan

### Phase 0: Baseline & Cleanup (1 session)

**Goal:** The repo compiles and all existing integrations still work.

**Tasks:**
1. Run `npx tsc --noEmit` in `src/` and `Mutly-Daemon-Agent/`. Fix only compiler errors.
2. Run `python -m py_compile` on all modified Python files from prior work. Fix only syntax errors.
3. Remove any partial/abandoned changes that don't have a passing Gate 1.
4. Document the current port/env matrix in `config/integration-state.md` (one source of truth).

**Verification:**
```bash
npx tsc --noEmit
cd Mutly-Daemon-Agent && npx tsc --noEmit
python -m py_compile Big-Homie-main/*.py
```

**Stop condition:** All verification commands pass. If a command fails, the phase isn't done.

**Human gate:** User confirms baseline is green.

---

### Phase 1: Big Homie Integration (2-3 sessions)

**Goal:** AgentBrowser treats Big Homie as a first-class remote skill provider.

**Tasks:**
1. Add Big Homie health check to `agent-scheduler.ts` before dispatching any skill.
2. Replace direct `fetch(.../execute)` in `executeSkill` with a typed client method in `big-homie-client.ts`.
3. Add deterministic fallback: if Big Homie is down, use local preset execution (already exists in `autonomous-agents.ts`).
4. Wire WebSocket responses from `big-homie-client.ts` into the event bus so other agents can react to Big Homie events.
5. Add a `/api/big-homie/status` route that surfaces connection + health to the UI.

**Verification:**
- `npx tsc --noEmit`
- With Big Homie stopped, scheduled agents still run via local presets.
- With Big Homie running, skill execution reaches Big Homie.

**Stop condition:** Health check + fallback + event bus wiring all verified.

**Human gate:** User confirms Big Homie integration is acceptable.

---

### Phase 2: Claw Protect Hardening (1 session)

**Goal:** Every agent action and pipeline node is security-gated.

**Tasks:**
1. Ensure `securityMiddleware.validateAction()` is called for every `executeAgent()` and every `executeNode()`.
2. Add prompt-injection scan to the Big Homie chat path (user message → Claw Protect → Big Homie).
3. Surface security events in the UI with a dedicated API route.
4. Confirm fail-closed behavior: Claw Protect down = request blocked.

**Verification:**
- `npx tsc --noEmit`
- Unit test: Claw Protect unreachable returns `approved: false`.
- Manual: chat message with injection keyword is blocked.

**Stop condition:** Security gate is on every action path and fail-closed is proven.

**Human gate:** User confirms security posture.

---

### Phase 3: Mutly Integration (2 sessions)

**Goal:** AgentBrowser can trigger and monitor Mutly build pipelines.

**Tasks:**
1. Create `src/lib/mutly-client.ts` with methods:
   - `startPipeline(projectDir)`
   - `getPipelineStatus(pipelineId)`
   - `getLatestPipelineStatus()`
2. Add `/api/mutly/pipeline/start` and `/api/mutly/pipeline/status/:id` Next.js routes.
3. Add UI affordance (button + status panel) to trigger and poll a Mutly pipeline.
4. Add health check for Mutly in the status dashboard.

**Verification:**
- `npx tsc --noEmit`
- With Mutly running, pipeline start returns an ID and status poll works.
- With Mutly stopped, API returns clear error and UI degrades.

**Stop condition:** Pipeline trigger + polling + health check verified end-to-end.

**Human gate:** User confirms Mutly integration is acceptable.

---

### Phase 4: VibeServe Integration (1-2 sessions)

**Goal:** AgentBrowser can call VibeServe tools directly, with Mutly as fallback proxy.

**Tasks:**
1. Create `src/lib/vibeserve-client.ts` with `callTool(toolName, args)`.
2. Call VibeServe directly via its configured port; fallback to Mutly `/api/vibeserve/tools/:toolName` if direct call fails.
3. Expose a UI panel listing available VibeServe tools (fetched from VibeServe or Mutly proxy).
4. Add health check for VibeServe.

**Verification:**
- `npx tsc --noEmit`
- Direct VibeServe call succeeds when VibeServe is up.
- Fallback to Mutly proxy succeeds when direct is blocked/down.

**Stop condition:** Direct + fallback tool calls verified.

**Human gate:** User confirms VibeServe integration is acceptable.

---

### Phase 5: RepoRank Integration (1 session)

**Goal:** AgentBrowser can analyze and rank a repository.

**Tasks:**
1. Create `src/lib/reporank-client.ts` with `analyzeRepo(repoUrl)` and `getRank(repoUrl)`.
2. Add `/api/reporank/analyze` and `/api/reporank/rank` routes.
3. Add UI input for repo URL and display analysis report / rank score.
4. Add health check for RepoRank.

**Verification:**
- `npx tsc --noEmit`
- With RepoRank running, analyze returns a report.
- With RepoRank down, API returns clear error.

**Stop condition:** Repo analysis + ranking + health check verified.

**Human gate:** User confirms RepoRank integration is acceptable.

---

### Phase 6: Deterministic Fallback Matrix (1 session)

**Goal:** No single service failure stops AgentBrowser.

**Tasks:**
1. Implement a fallback resolver that reads `config/deterministic-fallback.json`.
2. Apply fallback logic in:
   - `agent-scheduler.ts` (Big Homie down → local preset)
   - `agent-orchestrator.ts` (pipeline DAG fails → sequential execution)
   - `security-middleware.ts` (Claw Protect down → block)
   - `vibeserve-client.ts` (direct down → Mutly proxy)
3. Add a status dashboard route `/api/system/health` that reports every subsystem's reachability.

**Verification:**
- `npx tsc --noEmit`
- Kill each service one at a time; AgentBrowser degrades according to the matrix.

**Stop condition:** Every service failure has a tested fallback path.

**Human gate:** User confirms fallback behavior.

---

### Phase 7: Self-Healing & Crons (2 sessions)

**Goal:** The system runs 24/7 without manual intervention.

**Tasks:**
1. Ensure `agent-scheduler.ts` survives process restarts (use DB state, not memory).
2. Add cron recovery: if a scheduled agent misses its window, run it on next tick or mark it.
3. Add automatic reconnect with exponential backoff for Big Homie WebSocket.
4. Add health-check cron that alerts (event bus + log) when a subsystem is down for >5 minutes.
5. Add self-upgrade scanner results → actual upgrade job creation workflow.

**Verification:**
- `npx tsc --noEmit`
- Restart Next.js; scheduled agents resume from DB state.
- Kill Big Homie; reconnect attempts are logged with backoff.

**Stop condition:** Restart + reconnect + missed-window recovery verified.

**Human gate:** User confirms self-healing behavior.

---

### Phase 8: Polish & Documentation (1 session)

**Goal:** The system is shippable and explainable.

**Tasks:**
1. Update `README.md` with architecture diagram and quickstart.
2. Update `AGENTS.md` / `CLAUDE.md` with current integration points.
3. Add environment variable template (`.env.example`) covering all services.
4. Remove debug logs, unused imports, and stale `ab-test-*` directories.
5. Final `tsc` + `py_compile` run across all projects.

**Verification:**
- `npx tsc --noEmit` in `src/` and `Mutly-Daemon-Agent/`
- `python -m py_compile Big-Homie-main/*.py` and `VibeServe-main/vibeserve/*.py`
- `git status` shows only intentional changes.

**Stop condition:** All checks green, docs updated, repo clean.

**Human gate:** Final sign-off.

---

## Integration Matrix

| AgentBrowser Action | Big Homie | Claw Protect | Mutly | VibeServe | RepoRank | Local |
|---------------------|-----------|--------------|-------|-----------|----------|-------|
| Run agent skill | ✅ execute | ✅ pre-scan | — | — | — | ✅ preset fallback |
| Chat with LLM | ✅ WS | ✅ prompt scan | — | — | — | ✅ template fallback |
| Build project | — | — | ✅ pipeline | ✅ tools | — | — |
| Analyze repo | — | — | — | — | ✅ analyze | — |
| Run pipeline node | ✅ if agent node | ✅ pre-scan | ✅ if build node | — | — | ✅ sequential fallback |
| Security gate | — | ✅ required | — | — | — | ✅ keyword fallback |
| Self-healing | ✅ reconnect | ✅ fail-closed | ✅ poll | ✅ fallback | ✅ poll | ✅ scheduler |

---

## Off-Task Detector

If the agent starts doing any of these, stop it:

- Refactoring files not listed in the current phase
- Adding features not in the integration matrix
- Changing config files without Gate 1 evidence
- Writing tests for code that isn't in the phase
- "While I'm here, I might as well..."
- Adding packages that aren't required by a current task
- Creating new services or components not in the plan

---

## Checkpoint Commands

Run these at the start and end of every session:

```bash
# Type checks
npx tsc --noEmit
cd Mutly-Daemon-Agent && npx tsc --noEmit

# Python syntax
python -m py_compile Big-Homie-main/*.py
python -m py_compile VibeServe-main/vibeserve/*.py

# Git sanity
git status --short
git diff --stat
```

---

## Success Criteria

AgentBrowser is finalized when:

1. Every component in the matrix has a verified integration path.
2. Every integration has a tested fallback.
3. `tsc --noEmit` passes in all TypeScript projects.
4. `py_compile` passes in all Python modules.
5. The system can be started from a single documented command set.
6. A user can trigger an agent, a build pipeline, a tool call, and a repo analysis from the UI.
7. Killing any one backend service does not crash AgentBrowser.
