$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "Cel-Ron Reception Diary.lnk"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetBat = Join-Path -Path $ScriptDir -ChildPath "Launch-CelRon-Reception.bat"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetBat
$Shortcut.WorkingDirectory = $ScriptDir
$Shortcut.Description = "Cel-Ron Enterprises Reception Desk App"
$Shortcut.Save()

Write-Host "Created Desktop Shortcut: $ShortcutPath" -ForegroundColor Green
