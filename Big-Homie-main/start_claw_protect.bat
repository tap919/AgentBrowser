@echo off
echo Starting Claw Protect server...
cd /d "%~dp0Claw-Protect-main"
start "ClawProtect" cmd /k "npm run dev"
echo Claw Protect will run on http://localhost:3333
pause