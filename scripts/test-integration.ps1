# test-integration.ps1 - End-to-end integration test
# Exit code: 0 = all tests pass, N = number of failed tests

Write-Host "=== Blocklabor Integration Test ===" -ForegroundColor Cyan
Write-Host ""

$tests = @(
    @{ Name = "AgentBrowser Health";       Url = "http://localhost:3000/api/system/health"; ExpectJson = $false }
    @{ Name = "Mutly Health";              Url = "http://localhost:4000/api/health";         ExpectJson = $true }
    @{ Name = "VibeServe Health";          Url = "http://localhost:8000/health";             ExpectJson = $false }
    @{ Name = "RepoRank Health";           Url = "http://localhost:3001/health";             ExpectJson = $false }
    @{ Name = "Claw Protect Health";       Url = "http://localhost:3333/health";             ExpectJson = $false }
    @{ Name = "Big Homie Health";          Url = "http://localhost:8888/health";             ExpectJson = $false }
    @{ Name = "Mutly Pipeline Status";     Url = "http://localhost:4000/api/pipeline/status"; ExpectJson = $true }
    @{ Name = "VibeServe Tools Available"; Url = "http://localhost:8000/tools";               ExpectJson = $true }
)

$passed = 0
$failed = 0
$failedTests = @()

foreach ($test in $tests) {
    try {
        $response = Invoke-WebRequest -Uri $test.Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        $statusOk = $response.StatusCode -eq 200
        $contentOk = $true

        if ($statusOk -and $test.ExpectJson) {
            try {
                $null = $response.Content | ConvertFrom-Json
            } catch {
                $contentOk = $false
            }
        }

        if ($statusOk -and $contentOk) {
            Write-Host "[PASS] $($test.Name)" -ForegroundColor Green
            $passed++
        } else {
            $reason = if (-not $statusOk) { "HTTP $($response.StatusCode)" } else { "non-JSON response" }
            Write-Host "[FAIL] $($test.Name) - $reason" -ForegroundColor Red
            $failed++
            $failedTests += $test.Name
        }
    } catch [System.Net.WebException] {
        $statusCode = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode) {
            Write-Host "[FAIL] $($test.Name) - HTTP $statusCode" -ForegroundColor Red
        } else {
            Write-Host "[FAIL] $($test.Name) - unreachable" -ForegroundColor Red
        }
        $failed++
        $failedTests += $test.Name
    } catch {
        Write-Host "[FAIL] $($test.Name) - $_" -ForegroundColor Red
        $failed++
        $failedTests += $test.Name
    }
}

Write-Host ""
Write-Host "Results: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "Integration is healthy! All services are communicating." -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "Failed tests:" -ForegroundColor Red
    foreach ($name in $failedTests) {
        Write-Host "  - $name" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Check that all services are running." -ForegroundColor Yellow
    Write-Host "Run .\scripts\start-all.ps1 to start all services." -ForegroundColor Yellow
    exit 1
}