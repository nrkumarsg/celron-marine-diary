@echo off
title Cel-Ron Enterprises - Reception Visitor Diary
color 0B

echo ==============================================================================
echo           CEL-RON ENTERPRISES PTE LTD - RECEPTION DESK SYSTEM
echo ==============================================================================
echo.
echo Checking local web server on port 3000...

:: Test if server is already responding
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 (
    echo Web server is already running!
) else (
    echo Starting Cel-Ron local server in background...
    start /b npm run dev --prefix "%~dp0web" > nul 2>&1
    timeout /t 3 /nobreak > nul
)

echo.
echo Launching Cel-Ron Reception Desk in Dedicated Window...
echo.

:: Launch Edge or Chrome in standalone Native App mode
start msedge --app="http://localhost:3000/visit" || start chrome --app="http://localhost:3000/visit" || start http://localhost:3000/visit

echo System active. You may minimize this window.
timeout /t 5 > nul
exit
