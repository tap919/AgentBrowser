@echo off
start /b python big_homie_web.py > webgui.log 2>&1
timeout /t 3 /nobreak
echo Server should be running on http://localhost:8888