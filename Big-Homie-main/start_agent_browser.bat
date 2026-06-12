@echo off
echo Starting AgentBrowser server...
cd /d "%~dp0AgentBrowser-main"
start "AgentBrowser" cmd /k "npm run dev"
echo AgentBrowser will run on http://localhost:3000
pause