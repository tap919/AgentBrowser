# verify-integration.ps1 - Verifies all services are running and communicating
# Exit code: 0 = all healthy, 1 = one or more services unhealthy

$services = @(
    @{ Name = "AgentBrowser"; Url = "http://localhost:3000/api/system/health"; Port = 3000 },
    @{ Name = "RepoRank";     Url = "http://localhost:3001/health";             Port = 3001 },
    @{ Name = "Claw Protect"; Url = "http://localhost:3333/health";             Port = 3333 },
    @{ Name = "Mutly";        Url = "http://localhost:4000/api/health";        Port = 4000 },
    @{ Name = "Big Homie";    Url = "http://localhost:8888/health";             Port = 8888 },
    @{ Name = "VibeServe";    Url = "http://localhost:8000/health";             Port = 8000 }
)

Write-Host "=== Blocklabor Integration Health Check ===" -ForegroundColor Cyan
Write-Host ""

$healthyCount = 0
$unhealthyCount = 0
foreach ($svc in $services) {
    try {
        $response = Invoke-WebRequest -Uri $svc.Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            # Validate response is not empty / not HTML error page
            $contentLength = $response.Content.Length
            if ($contentLength -gt 0) {
                Write-Host "[OK] $($svc.Name) (port $($svc.Port)) - $($contentLength) bytes" -ForegroundColor Green
                $healthyCount++
            } else {
                Write-Host "[WARN] $($svc.Name) returned empty response" -ForegroundColor Yellow
                $unhealthyCount++
            }
        } else {
            Write-Host "[WARN] $($svc.Name) returned HTTP $($response.StatusCode)" -ForegroundColor Yellow
            $unhealthyCount++
        }
    } catch [System.Net.WebException] {
        $statusCode = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode) {
            Write-Host "[WARN] $($svc.Name) returned HTTP $statusCode" -ForegroundColor Yellow
        } else {
            Write-Host "[FAIL] $($svc.Name) (port $($svc.Port)) - not reachable" -ForegroundColor Red
        }
        $unhealthyCount++
    } catch {
        Write-Host "[FAIL] $($svc.Name) (port $($svc.Port)) - $_" -ForegroundColor Red
        $unhealthyCount++
    }
}

Write-Host ""
Write-Host "Summary: $healthyCount healthy, $unhealthyCount unhealthy" -ForegroundColor $(if ($unhealthyCount -eq 0) { "Green" } else { "Yellow" })

if ($unhealthyCount -eq 0) {
    Write-Host ""
    Write-Host "All services are healthy!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "Some services are not responding." -ForegroundColor Yellow
    Write-Host "Run .\scripts\start-all.ps1 to start all services." -ForegroundColor Yellow
    exit 1
}