<#
.SYNOPSIS
  AgentBrowser Fix Verification -- deterministic evidence that fixes are real.
  Exit code = number of FAILED checks. 0 = all pass.
.DESCRIPTION
  Each check independently examines the codebase for a specific class of issue.
  The script NEVER asks the LLM "is this fixed?" -- it reads files and runs commands.
  If the LLM claims a fix without this script passing, the LLM is lying.
#>

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
$PassCount = 0
$FailCount = 0
$SkippedCount = 0
$Results = @()

function Check {
    param([string]$Name, [scriptblock]$Block)
    try {
        $result = & $Block
        if ($result -eq $true) {
            $script:PassCount++
            $script:Results += @{Name=$Name; Status="PASS"; Detail=""}
        } else {
            $script:FailCount++
            $script:Results += @{Name=$Name; Status="FAIL"; Detail=$result}
        }
    } catch {
        $script:FailCount++
        $script:Results += @{Name=$Name; Status="FAIL"; Detail="EXCEPTION: $_"}
    }
}

function CheckWarning {
    param([string]$Name, [scriptblock]$Block)
    try {
        $result = & $Block
        if ($result -eq $true) {
            $script:PassCount++
            $script:Results += @{Name=$Name; Status="PASS"; Detail=""}
        } else {
            $script:SkippedCount++
            $script:Results += @{Name=$Name; Status="SKIP"; Detail=$result}
        }
    } catch {
        $script:SkippedCount++
        $script:Results += @{Name=$Name; Status="SKIP"; Detail="EXCEPTION: $_"}
    }
}

# ============================================================================
# HEADER
# ============================================================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " AgentBrowser -- Fix Verification Script" -ForegroundColor Cyan
Write-Host " Run this AFTER every fix session." -ForegroundColor Cyan
Write-Host " If any check FAILS, fixes are NOT done." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# P0: HARDCODED SECRETS
# ============================================================================
Write-Host "--- P0: Hardcoded Secrets ---" -ForegroundColor Yellow

Check "p0-gemini-api-key-removed" {
    $file = Join-Path $RepoRoot "reporank/.env"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "AIzaSyC5LgmB5TXvi1gmdNY1ShmpXhH3WIEIpKE") {
        return "Gemini API key still present in reporank/.env"
    }
    $true
}

Check "p0-github-oauth-secret-removed" {
    $file = Join-Path $RepoRoot "reporank/.env"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "58368fd83b77b8f8a2ba74ccc2a1023c3a0eff94") {
        return "GitHub OAuth client secret still present in reporank/.env"
    }
    $true
}

Check "p0-github-oauth-clientid-removed" {
    $file = Join-Path $RepoRoot "reporank/.env"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "Ov23likyVb1s6mKu8lhD") {
        return "GitHub OAuth client ID still present in reporank/.env"
    }
    $true
}

Check "p0-firebase-api-key-removed" {
    $file = Join-Path $RepoRoot "Claw-Protect-main/firebase-applet-config.json"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "AIzaSyAGkjtxMfdktbpWK_nlJJhoGZug8Lj6sb8") {
        return "Firebase API key still in firebase-applet-config.json"
    }
    $true
}

Check "p0-legacy-secret-removed" {
    $file = Join-Path $RepoRoot "Claw-Protect-main/src/lib/security/agentIdentityManager.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "claw-protect-identity") {
        return "Legacy secret 'claw-protect-identity' still in agentIdentityManager.ts"
    }
    $true
}

Check "p0-credentials-fallback-key-removed" {
    $file = Join-Path $RepoRoot "src/lib/credentials.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "fallback-key-64-chars") {
        return "Hardcoded fallback encryption key still present in credentials.ts"
    }
    $true
}

Check "p0-env-files-untracked" {
    $gitignore = Get-Content (Join-Path $RepoRoot ".gitignore") -Raw
    if ($gitignore -notmatch "\.env\*") {
        return ".env* not found in .gitignore"
    }
    $oldPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $result = & git -C $RepoRoot ls-files --error-unmatch ".env" 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldPref
    if ($exitCode -eq 0) {
        return ".env is STILL tracked by git - need 'git rm --cached .env'"
    }
    $true
}

Check "p0-env-example-no-real-secrets" {
    $file = Join-Path $RepoRoot ".env.example"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "AIza|sk-[a-zA-Z0-9]|ghp_") {
        return ".env.example contains what looks like real credentials"
    }
    $true
}

Check "p0-duplicate-api-env-cleaned" {
    $file = Join-Path $RepoRoot "reporank/apps/api/.env"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "AIzaSyC5LgmB5TXvi1gmdNY1ShmpXhH3WIEIpKE") {
        return "Gemini key also present in reporank/apps/api/.env"
    }
    $true
}

# ============================================================================
# P0: CADDYFILE SSRF
# ============================================================================
Write-Host "--- P0: Caddyfile SSRF ---" -ForegroundColor Yellow

Check "p0-caddyfile-no-open-proxy" {
    $file = Join-Path $RepoRoot "Caddyfile"
    if (-not (Test-Path $file)) { return "Caddyfile not found" }
    $content = Get-Content $file -Raw
    if ($content -match "XTransformPort") {
        return "Caddyfile still has XTransformPort query parameter (SSRF open proxy)"
    }
    $true
}

Check "p0-proxy-no-allowall-framing" {
    $file = Join-Path $RepoRoot "src/app/api/proxy/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "ALLOWALL") {
        return "proxy route still sets X-Frame-Options: ALLOWALL (clickjacking)"
    }
    if ($content -notmatch "X-Frame-Options.*DENY|frame-ancestors") {
        return "proxy route missing clickjacking protection headers"
    }
    $true
}

Check "p0-proxy-sanitizes-upstream-headers" {
    $file = Join-Path $RepoRoot "src/app/api/proxy/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "SAFE_RESPONSE_HEADERS|buildSafeResponseHeaders|sanitizeContentType") {
        return "proxy route does not whitelist/sanitize upstream response headers"
    }
    $true
}

Check "p1-proxy-ssrf-dns-resolution" {
    $file = Join-Path $RepoRoot "src/app/api/proxy/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "resolve4|isBlockedHost") {
        return "proxy route missing DNS-based SSRF guard"
    }
    $true
}

Check "p1-security-events-rate-limited" {
    $file = Join-Path $RepoRoot "src/app/api/security/events/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "checkRateLimit|rateLimit") {
        return "security/events route has no rate limiting"
    }
    $true
}

Check "p1-api-auth-per-key-rate-limit" {
    $file = Join-Path $RepoRoot "src/lib/api-auth-middleware.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "checkRateLimit") {
        return "api-auth-middleware has no per-key rate limiting"
    }
    $true
}

Check "p1-generate-route-has-auth" {
    $file = Join-Path $RepoRoot "src/app/api/generate/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "apiAuthMiddleware") {
        return "generate POST handler has no auth middleware"
    }
    $true
}

Check "p1-analyze-route-has-auth" {
    $file = Join-Path $RepoRoot "src/app/api/analyze/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "apiAuthMiddleware") {
        return "analyze POST handler has no auth middleware"
    }
    $true
}

Check "p1-proxy-route-has-auth" {
    $file = Join-Path $RepoRoot "src/app/api/proxy/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "apiAuthMiddleware") {
        return "proxy GET handler has no auth middleware"
    }
    $true
}

Check "p1-books-server-only" {
    $file = Join-Path $RepoRoot "src/lib/books.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "server-only") {
        return "books.ts missing server-only import"
    }
    $true
}

# ============================================================================
# P1: AUTH BYPASS
# ============================================================================
Write-Host "--- P1: Auth Bypass ---" -ForegroundColor Yellow

Check "p1-auth-middleware-no-get-bypass" {
    $file = Join-Path $RepoRoot "src/lib/api-auth-middleware.ts"
    if (-not (Test-Path $file)) { return "api-auth-middleware.ts not found" }
    $content = Get-Content $file -Raw
    if ($content -match "request\.method === 'GET'") {
        return "Auth middleware still skips authentication for GET requests"
    }
    $true
}

Check "p1-agent-memory-route-has-auth" {
    $file = Join-Path $RepoRoot "src/app/api/agent-memory/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "apiAuthMiddleware|withAuth|requireAuth") {
        return "agent-memory GET handler has no auth middleware"
    }
    $true
}

Check "p1-security-events-route-has-auth" {
    $file = Join-Path $RepoRoot "src/app/api/security/events/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "apiAuthMiddleware|withAuth|requireAuth") {
        return "security/events GET handler has no auth middleware"
    }
    $true
}

Check "p1-autonomous-agents-route-has-auth" {
    $file = Join-Path $RepoRoot "src/app/api/autonomous-agents/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "export async function PUT") {
        $hasExport = $content -match "export const PUT = withAuth"
        $hasMiddleware = $content -match "apiAuthMiddleware"
        if (-not ($hasExport -or $hasMiddleware)) {
            return "autonomous-agents PUT handler has no auth middleware"
        }
    }
    $true
}

Check "p1-big-homie-route-has-auth" {
    $file = Join-Path $RepoRoot "src/app/api/big-homie/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "apiAuthMiddleware|withAuth|requireAuth") {
        return "big-homie POST handler has no auth middleware (command execution endpoint!)"
    }
    $true
}

Check "p1-music-rights-route-has-auth" {
    $file = Join-Path $RepoRoot "src/app/api/music-rights/route.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -notmatch "apiAuthMiddleware|withAuth|requireAuth") {
        return "music-rights POST handler has no auth middleware (file write + subprocess!)"
    }
    $true
}

# ============================================================================
# P1: SQL INJECTION
# ============================================================================
Write-Host "--- P1: SQL Injection ---" -ForegroundColor Yellow

Check "p1-big-homie-sql-injection-fixed" {
    $file = Join-Path $RepoRoot "Big-Homie-main/database_ops.py"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    $badPatterns = @(
        'f"PRAGMA table_info',
        'f"SELECT COUNT',
        'f"PRAGMA index_list',
        'f"INSERT INTO {table}'
    )
    $found = @()
    foreach ($pat in $badPatterns) {
        if ($content -match $pat) {
            $found += $pat
        }
    }
    if ($found.Count -gt 0) {
        return "SQL injection pattern(s) still present: $($found -join ', ')"
    }
    $true
}

# ============================================================================
# P1: WEAK CRYPTO
# ============================================================================
Write-Host "--- P1: Weak Crypto ---" -ForegroundColor Yellow

Check "p1-credentials-no-xor-encryption" {
    $file = Join-Path $RepoRoot "src/lib/credentials.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "xorTransform|xorEncode|xorDecode|xor\(text|\.charCodeAt\(i\) \^ key") {
        return "Custom XOR encryption still present in credentials.ts"
    }
    $true
}

Check "p1-credentials-uses-web-crypto" {
    $file = Join-Path $RepoRoot "src/lib/credentials.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "crypto\.subtle|CryptoKey|encrypt|decrypt|aes|AES") {
        return $true
    }
    if ($content -notmatch "xorTransform") {
        return "XOR encryption removed but Web Crypto API not detected - verify manually"
    }
    $true
}

# ============================================================================
# P1: NEXT_PUBLIC SECRET EXPOSURE
# ============================================================================
Write-Host "--- P1: Secret Exposure ---" -ForegroundColor Yellow

Check "p1-no-next-public-api-key" {
    $file = Join-Path $RepoRoot ".env"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "NEXT_PUBLIC_AGENT_API_KEY") {
        return "NEXT_PUBLIC_AGENT_API_KEY still in .env"
    }
    $true
}

Check "p1-no-next-public-in-example" {
    $file = Join-Path $RepoRoot ".env.example"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "NEXT_PUBLIC_AGENT_API_KEY") {
        return "NEXT_PUBLIC_AGENT_API_KEY still in .env.example"
    }
    $true
}

# ============================================================================
# P1: VibeServe Auth
# ============================================================================
Write-Host "--- P1: VibeServe Auth ---" -ForegroundColor Yellow

Check "p1-vibeserve-agent-ws-auth" {
    $file = Join-Path $RepoRoot "VibeServe-main/vibeserve/agent_ws.py"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "authentication disabled") {
        return "agent_ws.py still has 'authentication disabled' fallback"
    }
    $true
}

Check "p1-vibeserve-gitnexus-auth" {
    $file = Join-Path $RepoRoot "VibeServe-main/vibeserve/tools/gitnexus_bridge.py"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "@audit_tool" -and $content -notmatch "@require_scope") {
        return "gitnexus_bridge tools have @audit_tool but no @require_scope"
    }
    $true
}

Check "p1-vibeserve-repo-indexer-auth" {
    $file = Join-Path $RepoRoot "VibeServe-main/vibeserve/tools/repo_indexer.py"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "@audit_tool" -and $content -notmatch "@require_scope") {
        return "repo_indexer tools have @audit_tool but no @require_scope"
    }
    $true
}

# ============================================================================
# P1: Big Homie Auth
# ============================================================================
Write-Host "--- P1: Big Homie Auth ---" -ForegroundColor Yellow

Check "p1-big-homie-mcp-auth" {
    $file = Join-Path $RepoRoot "Big-Homie-main/mcp_server.py"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "confirmed\s*=\s*True") {
        return "mcp_server.py has hardcoded confirmed=True"
    }
    if ($content -notmatch "api_key|token|auth") {
        return "mcp_server.py has no authentication check on tool execution"
    }
    $true
}

Check "p1-big-homie-browser-ssrf" {
    $file = Join-Path $RepoRoot "Big-Homie-main/browser_skill.py"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "await self\.page\.goto\(url" -and $content -notmatch "allowed_domains|url_validate|blocked_schemes") {
        return "browser_skill.py has no URL validation before page.goto (SSRF risk)"
    }
    $true
}

# ============================================================================
# P1: Claw Protect Cryptography
# ============================================================================
Write-Host "--- P1: Claw Protect Crypto ---" -ForegroundColor Yellow

Check "p1-claw-no-math-random-for-nonces" {
    $file = Join-Path $RepoRoot "Claw-Protect-main/src/lib/security/agentIdentityManager.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "Math\.random\(\)\.toString\(36\)") {
        return "Math.random() still used for nonce/challenge ID generation"
    }
    $true
}

Check "p1-claw-no-base64-hash" {
    $file = Join-Path $RepoRoot "Claw-Protect-main/src/lib/security/agentIdentityManager.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "Buffer\.from\(nonce.*publicKey\)") {
        return "Challenge verification still uses base64 encoding instead of HMAC"
    }
    $true
}

# ============================================================================
# P2: INFRASTRUCTURE
# ============================================================================
Write-Host "--- P2: Infrastructure ---" -ForegroundColor Yellow

Check "p2-dockerfile-has-user" {
    $file = Join-Path $RepoRoot "Dockerfile"
    if (-not (Test-Path $file)) { return "Dockerfile not found" }
    $content = Get-Content $file -Raw
    if ($content -notmatch "USER ") {
        return "Dockerfile production stage has no USER directive - runs as root"
    }
    $true
}

Check "p2-docker-compose-no-dev-keys" {
    $file = Join-Path $RepoRoot "docker-compose.yml"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "dev-key") {
        return "docker-compose.yml still has hardcoded 'dev-key' fallback values"
    }
    $true
}

CheckWarning "p2-start-all-no-npm-run-dev" {
    $file = Join-Path $RepoRoot "start-all.ps1"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "npm run dev") {
        return "start-all.ps1 uses 'npm run dev' - should use 'npm run start' for production"
    }
    $true
}

Check "p2-prisma-no-accept-data-loss" {
    $file = Join-Path $RepoRoot "reporank/docker-entrypoint.sh"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "accept-data-loss") {
        return "docker-entrypoint.sh still uses --accept-data-loss flag"
    }
    $true
}

# ============================================================================
# P2: RACE CONDITIONS
# ============================================================================
Write-Host "--- P2: Race Conditions ---" -ForegroundColor Yellow

Check "p2-browser-controller-no-module-level-state" {
    $file = Join-Path $RepoRoot "src/lib/browser-controller.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "^let browserInstance" -or $content -match "^let activeContext" -or $content -match "^let activePage") {
        return "browser-controller.ts still uses module-level mutable state without locking"
    }
    $true
}

CheckWarning "p2-claw-protect-audit-log-bounded" {
    $file = Join-Path $RepoRoot "src/lib/claw-protect-bridge.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "this\.auditLog\.push\(entry\)" -and $content -notmatch "shift|pop|slice|splice|maxLog|maxEntries") {
        return "auditLog has no size limit - unbounded memory growth"
    }
    $true
}

# ============================================================================
# P3: CODE QUALITY
# ============================================================================
Write-Host "--- P3: Code Quality ---" -ForegroundColor Yellow

Check "p3-no-console-log" {
    $sourceRoots = @("src", "Big-Homie-main", "Claw-Protect-main", "VibeServe-main", "Mutly-Daemon-Agent", "reporank")
    foreach ($root in $sourceRoots) {
        $dir = Join-Path $RepoRoot $root
        if (-not (Test-Path $dir)) { continue }
        $files = @(Get-ChildItem -Path $dir -Recurse -ErrorAction SilentlyContinue -Include *.ts,*.tsx,*.py | Where-Object { -not $_.PSIsContainer -and $_.FullName -notmatch "\\node_modules\\|\\dist\\|\\build\\|\\tests\\|\\releases\\|\\release\\|\\generated-apps\\|\\test-results\\|\\.next\\|\\.vite\\|\\.vercel\\|\\.turbo" })
        foreach ($file in $files) {
            $content = [System.IO.File]::ReadAllText($file.FullName)
            if ($content -match "console\.log\(") {
                return "File $($file.Name) contains console.log - use logger instead"
            }
        }
    }
    $true
}

Check "p3-no-todo-fixme" {
    $sourceRoots = @("src", "Big-Homie-main", "Claw-Protect-main", "VibeServe-main", "Mutly-Daemon-Agent", "reporank")
    foreach ($root in $sourceRoots) {
        $dir = Join-Path $RepoRoot $root
        if (-not (Test-Path $dir)) { continue }
        $files = @(Get-ChildItem -Path $dir -Recurse -ErrorAction SilentlyContinue -Include *.ts,*.tsx,*.py | Where-Object { -not $_.PSIsContainer -and $_.FullName -notmatch "\\node_modules\\|\\dist\\|\\build\\|\\tests\\|\\releases\\|\\release\\|\\generated-apps\\|\\test-results\\|\\.next\\|\\.vite\\|\\.vercel\\|\\.turbo" })
        foreach ($file in $files) {
            $content = [System.IO.File]::ReadAllText($file.FullName)
            if ($content -match "TODO|FIXME") {
                return "File $($file.Name) contains TODO/FIXME"
            }
        }
    }
    $true
}

CheckWarning "p3-claw-csp-no-unsafe-inline" {
    $file = Join-Path $RepoRoot "Claw-Protect-main/server.ts"
    if (-not (Test-Path $file)) { return $true }
    $content = Get-Content $file -Raw
    if ($content -match "unsafe-inline") {
        return "CSP still allows 'unsafe-inline' for scripts or styles"
    }
    $true
}

# ============================================================================
# COMPILE CHECK
# ============================================================================
Write-Host "--- Compile Check ---" -ForegroundColor Yellow

Check "compile-agentbrowser-tsc" {
    Push-Location $RepoRoot
    $result = & npx.cmd tsc --noEmit 2>&1
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -ne 0) {
        return "TypeScript compilation failed. Run 'npx tsc --noEmit' to see errors."
    }
    $true
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " RESULTS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$format = "  [{0,-4}] {1,-50} {2}"
foreach ($r in $Results) {
    $color = switch ($r.Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "SKIP" { "DarkYellow" }
    }
    if ($r.Detail) {
        Write-Host ($format -f $r.Status, $r.Name, $r.Detail) -ForegroundColor $color
    } else {
        Write-Host ("  [{0,-4}] {1}" -f $r.Status, $r.Name) -ForegroundColor $color
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
if ($FailCount -eq 0) {
    Write-Host "  PASS: $PassCount  |  FAIL: $FailCount  |  SKIP: $SkippedCount" -ForegroundColor Green
} else {
    Write-Host "  PASS: $PassCount  |  FAIL: $FailCount  |  SKIP: $SkippedCount" -ForegroundColor Red
}
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($FailCount -eq 0) {
    Write-Host " ALL FIXES VERIFIED. Good work." -ForegroundColor Green
    exit 0
} else {
    Write-Host " $FailCount fix(es) are NOT actually fixed. Do not claim completion." -ForegroundColor Red
    Write-Host " The LLM must fix each FAILING check and re-run this script." -ForegroundColor Red
    exit $FailCount
}
