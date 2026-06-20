# ============================================================
# AgentBrowser Ecosystem — Unified Startup Script
# ============================================================
# Starts all services with non-conflicting ports.
# Run from the root directory: .\start-all.ps1

$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " AgentBrowser Ecosystem — Starting Services" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── 1. Big-Homie (Python) → localhost:8888 ──
Write-Host "`n[1/5] Big-Homie (port 8888)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\Big-Homie-main'; Write-Host 'Big-Homie starting on :8888...'; python main.py"
Start-Sleep -Seconds 2

# ── 2. Claw-Protect (TypeScript) → localhost:3333 ──
Write-Host "`n[2/5] Claw-Protect (port 3333)..." -ForegroundColor Yellow
Set-Location "$Root\Claw-Protect-main"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\Claw-Protect-main'; Write-Host 'Claw-Protect starting on :3333...'; npm run start"
Start-Sleep -Seconds 2

# ── 3. Mutly-Daemon-Agent → localhost:4000 ──
Write-Host "`n[3/5] Mutly Daemon (port 4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\Mutly-Daemon-Agent'; Write-Host 'Mutly starting on :4000...'; npm run start"
Start-Sleep -Seconds 2

# ── 4. RepoRank API → localhost:3001 ──
Write-Host "`n[4/5] RepoRank API (port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\reporank'; Write-Host 'RepoRank API starting on :3001...'; npm run start --workspace=@reporank/api 2>&1 | Write-Host"
Start-Sleep -Seconds 2

# ── 5. AgentBrowser (Next.js) → localhost:3000 ──
Write-Host "`n[5/5] AgentBrowser UI (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root'; Write-Host 'AgentBrowser starting on :3000...'; npm run start"

Set-Location $Root

Write-Host "`n============================================" -ForegroundColor Green
Write-Host " All services launched!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host " Service           | Port  | URL" -ForegroundColor White
Write-Host " ----------------- | ----- | ---" -ForegroundColor White
Write-Host " AgentBrowser UI   | 3000  | http://localhost:3000" -ForegroundColor Cyan
Write-Host " Big-Homie Agent   | 8888  | http://localhost:8888" -ForegroundColor Cyan
Write-Host " Claw-Protect      | 3333  | http://localhost:3333" -ForegroundColor Cyan
Write-Host " Mutly Daemon      | 4000  | http://localhost:4000" -ForegroundColor Cyan
Write-Host " RepoRank API      | 3001  | http://localhost:3001" -ForegroundColor Cyan
Write-Host " VibeServe MCP     | 8000  | http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host " VibeServe (optional): run separately via" -ForegroundColor DarkGray
Write-Host "   cd VibeServe-main\ide && npm run start   (IDE on :3005)" -ForegroundColor DarkGray
Write-Host "   cd VibeServe-main && python -m vibeserve  (MCP on :8000)" -ForegroundColor DarkGray
Write-Host ""
