# ENFORCE-FIX-PROTOCOL — No BS Fix Enforcement

## Why This Exists

The LLM has been claiming fixes are complete when they aren't. Code was "fixed" but:
- Files were never modified
- Fixes were superficial (changed comments, not logic)
- Verification commands were fabricated or never run
- Secret credentials remained committed after "credential removal"

**This stops now.** Every fix must pass mechanical verification — not LLM judgment.

---

## Rule 1: The Verification Script Is the Only Truth

`verify-audit-fixes.ps1` is the sole arbiter of whether a fix is done. Do not claim a fix is complete unless this script passes for that check.

**The LLM must run this script at the end of every fix session.** If the script shows FAIL for any check, the fix is not done. Period.

```
PS> .\verify-audit-fixes.ps1
[check:hardcoded-secrets] PASS
[check:sql-injection]     FAIL  — database_ops.py still uses f-string interpolation
[check:auth-bypass]       FAIL  — api-auth-middleware.ts still skips GET
```

If any check is FAIL, the LLM must fix it and re-run the script. No exceptions.

---

## Rule 2: Gate 1 Before Every Fix

Before writing any fix code, the LLM MUST prove the bug exists with a command:

**Wrong (lying):**
> "I checked the file and the credential is still there, let me fix it."

**Correct (proof):**
> ```
> === GATE 1: PROVING BUG ===
> PS> Select-String -Pattern "AIzaSy" -LiteralPath reporank/.env
> reporank/.env:4:GEMINI_API_KEY=AIzaSyC5LgmB5TXvi1gmdNY1ShmpXhH3WIEIpKE
> === CONFIRMED: Live credential in committed file ===
> ```

If you cannot produce raw terminal output showing the problem, you cannot fix it.

---

## Rule 3: The Fix Must Change the File

After applying a fix, the LLM must prove the file actually changed:

```
PS> git diff --stat
 src/lib/api-auth-middleware.ts | 5 ++++-
 1 file changed, 4 insertions(+), 1 deletion(-)
```

If `git diff` shows nothing for the files you claim to have fixed, **you are lying**. The session must stop.

---

## Rule 4: Gate 5 — Prove the Bug Is Gone

After fixing, the LLM must run a command proving the old broken behavior no longer exists:

| Issue | Pre-fix Proof | Post-fix Proof |
|-------|---------------|----------------|
| Hardcoded secret | `Select-String -Pattern "AIzaSy" reporank/.env` shows key | Same command shows no match |
| SQL injection | `Select-String -Pattern "f\".*table_name" database_ops.py` shows f-string | Same command shows parameterized query |
| Auth bypass | `Select-String -Pattern "method === 'GET'" api-auth-middleware.ts` shows early return | Same command shows no early return |
| Open proxy | `Select-String -Pattern "XTransformPort" Caddyfile` shows query param | Line removed or restricted |

**If you cannot undo the Gate 1 proof, the fix is fake.**

---

## Rule 5: Atomic Fixes Only

One fix per commit. No bundled changes. Each commit message must reference:
- The Gate 1 evidence (what was proven broken)
- The Gate 5 evidence (what proves it's fixed)

```
git commit -m "fix: remove hardcoded Gemini API key from reporank/.env

Gate 1: reporank/.env contained AIzaSyC5LgmB5TXvi1gmdNY1ShmpXhH3WIEIpKE
Gate 5: verify-audit-fixes.ps1 check [hardcoded-secrets] now PASS"
```

---

## Rule 6: The Shame List

If the LLM is caught fabricating a fix (claiming a change without `git diff` evidence, fabricating verification output, or editing the wrong file), the session is invalidated. The correct approach is:

1. Admit the fabrication
2. Re-read the actual current state of the file
3. Apply the actual fix
4. Run the verification

---

## Fix Priority (From Audit)

| Priority | Issue | File | Verify Command |
|----------|-------|------|----------------|
| P0 | Hardcoded Gemini API key | `reporank/.env` | `Select-String "AIzaSyC5LgmB5TXvi1gmdNY1ShmpXhH3WIEIpKE"` |
| P0 | Hardcoded GitHub OAuth secret | `reporank/.env` | `Select-String "58368fd83b77b8f8a2ba74ccc2a1023c3a0eff94"` |
| P0 | Hardcoded Firebase API key | `Claw-Protect-main/firebase-applet-config.json` | `Select-String "AIzaSyAGkjtxMfdktbpWK_nlJJhoGZug8Lj6sb8"` |
| P0 | Caddyfile open proxy | `Caddyfile` | `Select-String "XTransformPort" Caddyfile` |
| P1 | Auth bypass (GET skips auth) | `src/lib/api-auth-middleware.ts` | Check GET requests require auth |
| P1 | Missing auth on 14+ routes | `src/app/api/*/route.ts` | Verify middleware is applied |
| P1 | SQL injection in Big Homie | `Big-Homie-main/database_ops.py` | f-string pattern check |
| P1 | Custom XOR credential encryption | `src/lib/credentials.ts` | Replace with Web Crypto API |
| P1 | NEXT_PUBLIC secret exposure | `.env` | Remove NEXT_PUBLIC_ prefix |
| P2 | Weak crypto challenges | `Claw-Protect-main/src/lib/security/agentIdentityManager.ts` | Replace Math.random/Base64 |
| P2 | Race conditions (browser-controller) | `src/lib/browser-controller.ts` | Module-level state locking |
| P2 | Root Dockerfile | `Dockerfile` | Add USER directive |
| P3 | Memory leaks | Various | Add bounds to audit logs |
| P3 | CSP unsafe-inline | `Claw-Protect-main/server.ts` | Restrict CSP |

---

## Session Start Checklist

Every fix session MUST begin with:

```powershell
# 1. Run the verification script to see current state
.\verify-audit-fixes.ps1

# 2. Show Gate 1 proof for each failing check
# 3. Fix one check at a time
# 4. Re-run verification
# 5. Commit with Gate 1 + Gate 5 references
```

## Session End Checklist

Every fix session MUST end with:

```powershell
# 1. Run full verification
.\verify-audit-fixes.ps1

# 2. Show git diff
git diff --stat

# 3. Show git log
git log --oneline -5
```

If the verification script shows any FAIL, the session is NOT done.
