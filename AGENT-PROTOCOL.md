# Agent Protocol — No BS Work

## The Five Gates

Every fix, feature, or change must pass these 5 gates BEFORE a single line of implementation code is written. The agent announces which gate it's at before proceeding.

### Gate 1: Prove the Bug Exists

Run one command or write one test that demonstrates the broken behavior. No fix without a reproduction.

```
# GOOD: grep for actual usage before flagging dead code
grep -rn "shadowAgentDiscovery" server.ts | grep -v import

# GOOD: check if file is tracked before claiming commit
git ls-files --error-unmatch .env

# GOOD: verify CSP value before claiming bypass
grep "connect-src" next.config.ts

# BAD: "I saw the import and assumed it was unused"
# BAD: "I read the file and assumed it was wrong"
```

**Pass criteria:** The agent can produce exact output showing the problem exists. Not an interpretation — raw evidence.

### Gate 2: Check All Callers Before Changing Any API

When modifying a function signature, type, or interface:

```
grep -r "functionName\|import.*from.*module" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**Pass criteria:** Every caller is listed with its file path and line number. If the API changes, every caller is updated in the same PR or a compat shim is provided.

### Gate 3: Timebox the Investigation

| Scope | Time Limit |
|-------|-----------|
| Prove a bug exists | 5 minutes |
| Trace all callers | 5 minutes |
| Implement a fix | 15 minutes per file |
| Verify the fix | 3 minutes |
| **Total per finding** | **30 minutes** |

If the timer expires, the finding is tagged `[UNCONFIRMED]` and deferred. No exceptions.

### Gate 4: Deliver Fixes in Order of Proven Severity

1. 🔴 **Critical** — proven security vulnerability, data loss, or crash
2. 🟠 **High** — proven bug that causes wrong behavior
3. 🟡 **Medium** — proven race condition or leak
4. 🟢 **Low** — code smell, speculative infrastructure, cosmetic

**Speculative work (unconfirmed races, "this might happen") is always delivered last**, after all proven bugs are fixed. Tag speculative code with `[INSURANCE]`.

### Gate 5: Verify the Fix

After implementation, prove the fix works:

```
# Type check
npx tsc --noEmit

# Run existing tests
npx vitest run --related=path/to/changed/file

# If no test exists, write one that would have caught the bug
```

**Pass criteria:** Compiler passes, existing tests pass, and either a new test covers the fix OR one command proves the old broken behavior is gone.

---

## Conversation Flow

The agent must output a structured header at each phase transition:

```
=== GATE 1: PROVING BUG ===
[command/output showing the problem]

=== GATE 2: CALLER ANALYSIS ===
[file:line list of every caller affected]

=== GATE 3: TIMEBOX ===
[estimated time / actual time]

=== GATE 4: SEVERITY ===
[proven severity label]

=== GATE 5: VERIFICATION ===
[command output showing fix works]
```

If the agent cannot produce a gate's output, it does not proceed to the next gate.

---

## Anti-Pattern Catalog

| Anti-Pattern | Why It's BS | Instead |
|---|---|---|
| "I saw X in the code, it looks wrong" | No evidence | Run a command that proves it's wrong |
| Changing sync→async without checking callers | Breaks 3+ components silently | `grep -r` callers first |
| Adding infrastructure for an unobserved race | Wasted code + complexity | Defer until race is observed |
| Flagging an issue as "fixing it" when it was already fine | Wasted time + false delta | Gate 1 catches this |
| Claiming dead code without checking routes | Double work to retract | `grep` for handler references |
| "We should add X for future-proofing" | Future never comes | Only add when X becomes necessary |
| Spending equal time on imaginary vs real bugs | 50%+ waste | Timebox + severity ranking |

---

## Session Retrospective

After every session, the agent outputs a waste report:

```markdown
## Waste Report
- Findings that failed Gate 1 (proven): 0
- Time spent on unproven findings: 0m
- Callers missed before API change: 0
- Speculative code delivered: [list with justification]
- Token efficiency: [actual tokens / minimum possible tokens]
```

---

## Agent Oath

I will not write implementation code for a finding I cannot prove exists. I will not change an API without listing every caller. I will not add infrastructure for a race I have not observed. I will fix bugs in order of proven severity, not in order of interestingness. I will timebox every investigation. I will verify every fix.
