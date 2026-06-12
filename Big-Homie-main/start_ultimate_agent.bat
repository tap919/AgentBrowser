@echo off
REM Ultimate Agent Launcher — All Systems
echo =========================================
echo  Ultimate Agent — Starting All Services
echo =========================================
echo.

echo [1/5] Starting Claw Protect (port 3333)...
start "ClawProtect" cmd /k "cd /d %~dp0..\Claw-Protect-main && npm run dev"

timeout /t 4 /nobreak > nul

echo [2/5] Starting AgentBrowser UI (port 3000)...
start "AgentBrowser" cmd /k "cd /d %~dp0.. && npm run dev"

timeout /t 4 /nobreak > nul

echo [3/5] Starting Big Homie (port 8888)...
start "BigHomie" cmd /k "cd /d %~dp0 && python big_homie_web.py"

timeout /t 4 /nobreak > nul

echo [4/5] Checking for n8n (port 5678)...
where n8n >nul 2>&1
if %errorlevel%==0 (
    echo      n8n found — starting workflow engine...
    start "n8n" cmd /k "n8n start"
) else (
    echo      n8n not found. Install with: npm install -g n8n
    echo      Then re-run this launcher to enable visual workflows.
)

timeout /t 2 /nobreak > nul

echo.
echo =========================================
echo  All services launching...
echo.
echo  UI:          http://localhost:3000
echo  Big Homie:   http://localhost:8888
echo  Claw Protect:http://localhost:3333
echo  n8n:         http://localhost:5678
echo  Memory API:  http://localhost:8888/memory/all
echo  Crew API:    http://localhost:8888/crew
echo  Crawl API:   http://localhost:8888/crawl
echo =========================================
echo.
pause