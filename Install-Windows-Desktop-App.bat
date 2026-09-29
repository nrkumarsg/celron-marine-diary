@echo off
title Install Cel-Ron Reception Diary on Windows Desktop
color 0A

echo ==============================================================================
echo       INSTALLING CEL-RON RECEPTION DESK ON YOUR WINDOWS DESKTOP
echo ==============================================================================
echo.

set TARGET_BAT=%~dp0Launch-CelRon-Reception.bat
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Cel-Ron Reception Diary.lnk

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%TARGET_BAT%'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.WindowStyle = 7; $Shortcut.Description = 'Cel-Ron Enterprises Reception Visitor Diary'; $Shortcut.Save()"

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Shortcut successfully created on your Windows Desktop!
    echo Look for: "Cel-Ron Reception Diary" on your Desktop.
    echo.
) else (
    echo [NOTE] Please run this batch script as administrator if desktop access is restricted.
)

pause
