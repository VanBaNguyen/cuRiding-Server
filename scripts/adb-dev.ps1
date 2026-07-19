# Forward Metro (8081) and the local server (8000) to a USB Android device.
# Run from repo root:  .\scripts\adb-dev.ps1
#
# On the phone: enable Developer options + USB debugging, plug in USB,
# tap Allow when prompted, then re-run this script.

$ErrorActionPreference = "Stop"

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
    $adbCmd = Get-Command adb -ErrorAction SilentlyContinue
    if ($adbCmd) {
        $adb = $adbCmd.Source
    } else {
        throw "adb not found. Install Android SDK platform-tools."
    }
}

Write-Host "Checking devices..."
& $adb devices -l

$state = (& $adb get-state 2>&1 | Out-String).Trim()
if ($state -match "unauthorized") {
    Write-Host ""
    Write-Host "Phone is UNAUTHORIZED. Unlock it and tap Allow on the USB debugging prompt, then run this again."
    exit 1
}
if ($state -notmatch "device") {
    Write-Host ""
    Write-Host "No authorized device. Plug in the phone and accept the debugging prompt."
    exit 1
}

Write-Host ""
Write-Host "Setting up port forwards..."
& $adb reverse tcp:8081 tcp:8081
& $adb reverse tcp:8000 tcp:8000
& $adb reverse --list

Write-Host ""
Write-Host "Done. Start the app with local server URLs:"
Write-Host '  cd frontend'
Write-Host '  $env:EXPO_PUBLIC_WS_URL="ws://localhost:8000"'
Write-Host '  $env:EXPO_PUBLIC_API_URL="http://localhost:8000"'
Write-Host '  npx expo start --android'
Write-Host ""
Write-Host "Or use the production tunnel (no adb reverse for port 8000 needed):"
Write-Host '  cd frontend'
Write-Host '  npx expo start --android'
