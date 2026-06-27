# start-all.ps1 - Starts all Blocklabor services in dependency order
# Usage: .\start-all.ps1 [-SkipReadinessCheck]

param(
    [switch]$SkipReadinessCheck
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot

# Service definitions: name -> { dir, command, port, healthPath }
$services = @(
    @{ Name = "RepoRank";     Dir = "AgentBrowser-main\reporank";        Cmd = "pnpm dev";                                       Port = 3001; Health = "/health" }
    @{ Name = "VibeServe";    Dir = "AgentBrowser-main\VibeServe-main";   Cmd = "python -m vibeserve";                            Port = 8000; Health = "/health" }
    @{ Name = "Claw Protect"; Dir = "AgentBrowser-main\Claw-Protect-main";Cmd = "npm run dev";                                     Port = 3333; Health = "/health" }
    @{ Name = "Mutly";        Dir = "AgentBrowser-main\Mutly-Daemon-Agent";Cmd = "npm run dev";                                   Port = 4000; Health = "/api/health" }
    @{ Name = "Big Homie";    Dir = "AgentBrowser-main\Big-Homie-main";   Cmd = "uvicorn big_homie_web:app --port 8888";          Port = 8888; Health = "/health" }
    @{ Name = "AgentBrowser"; Dir = ".";                                  Cmd = "npm run dev";                                     Port = 3000; Health = "/api/system/health" }
)

$totalSteps = $services.Count
Write-Host "Starting $totalSteps Blocklabor services..." -ForegroundColor Cyan
Write-Host ""

# Verify all service directories exist before starting
Write-Host "--- Pre-flight check ---" -ForegroundColor Yellow
foreach ($svc in $services) {
    $svcPath = Join-Path $root $svc.Dir
    if (-not (Test-Path $svcPath)) {
        Write-Host "[SKIP] $($svc.Name) - directory not found: $svcPath" -ForegroundColor DarkYellow
        $svc.Skip = $true
    } else {
        Write-Host "[OK] $($svc.Name) - $svcPath" -ForegroundColor Green
    }
}
Write-Host ""

$startedCount = 0
for ($i = 0; $i -lt $services.Count; $i++) {
    $svc = $services[$i]
    $stepNum = $i + 1

    if ($svc.Skip) {
        Write-Host "[$stepNum/$totalSteps] Skipping $($svc.Name) (directory not found)" -ForegroundColor DarkYellow
        continue
    }

    $svcPath = Join-Path $root $svc.Dir
    Write-Host "[$stepNum/$totalSteps] Starting $($svc.Name) (port $($svc.Port))..." -ForegroundColor Yellow

    $proc = Start-Process powershell `
        -ArgumentList "-NoExit", "-Command", "cd '$svcPath'; $($svc.Cmd)" `
        -WindowStyle Normal `
        -PassThru

    $startedCount++

    # Wait for service readiness (unless skipped)
    if (-not $SkipReadinessCheck) {
        $ready = $false
        $maxAttempts = 30  # 30 seconds max
        $attempt = 0
        while (-not $ready -and $attempt -lt $maxAttempts) {
            $attempt++
            Start-Sleep -Seconds 1
            try {
                $response = Invoke-WebRequest `
                    -Uri "http://localhost:$($svc.Port)$($svc.Health)" `
                    -TimeoutSec 2 `
                    -UseBasicParsing `
                    -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Host "  -> $($svc.Name) is ready" -ForegroundColor DarkGreen
                    $ready = $true
                }
            } catch {
                # Service not ready yet, keep waiting
            }
        }
        if (-not $ready) {
            Write-Host "  -> $($svc.Name) did not respond within 30s (continuing anyway)" -ForegroundColor DarkYellow
        }
    } else {
        Start-Sleep -Seconds 3
    }
}

Write-Host ""
Write-Host "Started $startedCount/$totalSteps services" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
foreach ($svc in $services | Where-Object { -not $_.Skip }) {
    Write-Host "  $($svc.Name):".PadRight(16) "http://localhost:$($svc.Port)" -ForegroundColor White
}
Write-Host ""
Write-Host "Run .\scripts\verify-integration.ps1 to check all services are healthy." -ForegroundColor Yellow