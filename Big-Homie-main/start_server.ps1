$ErrorActionPreference = "Stop"
$port = 8888

# Kill existing process on port
try {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Id $conn[0].OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} catch {}

# Start the server
$pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonPath) {
    $pythonPath = "python"
}

$proc = Start-Process $pythonPath -ArgumentList "big_homie_web.py" -WorkingDirectory "C:\Users\User\Desktop\Overlab\Big-Homie-main" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 5

# Check if running
if ($proc.HasExited) {
    Write-Host "Server failed to start"
    exit 1
} else {
    Write-Host "Big Homie Web GUI running on http://localhost:8888"
    Write-Host "Process ID: $($proc.Id)"
}