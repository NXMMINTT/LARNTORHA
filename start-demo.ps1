# Starts the demo: backend (:8000), frontend (:3000) and ngrok (public HTTPS -> :8000),
# each in its own window so you can watch the logs. Double-click start-demo.bat to run.
# The ngrok domain is read from NGROK_DOMAIN in backend/.env.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$domain = (Get-Content "$root\backend\.env" -Encoding UTF8 |
    Where-Object { $_ -match '^\s*NGROK_DOMAIN\s*=' } |
    ForEach-Object { ($_ -split '=', 2)[1].Split('#')[0].Trim() }) | Select-Object -First 1
if (-not $domain) {
    Write-Host "NGROK_DOMAIN is missing in backend\.env (e.g. NGROK_DOMAIN=xxx.ngrok-free.app)" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

$ngrok = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $ngrok) {
    $ngrok = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ngrok.exe -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $ngrok) {
    Write-Host "ngrok not found. Install with: winget install Ngrok.Ngrok" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

foreach ($port in 8000, 3000) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "Port $port is already in use. Close the old window/process first." -ForegroundColor Yellow
        Read-Host "Press Enter to close"
        exit 1
    }
}

function Open-Window([string]$title, [string]$dir, [string]$cmd) {
    $full = "`$Host.UI.RawUI.WindowTitle = '$title'; [Console]::OutputEncoding = [Text.Encoding]::UTF8; $cmd"
    Start-Process powershell -WorkingDirectory $dir -ArgumentList '-NoExit', '-Command', $full
}

Open-Window "LarnTorHa backend :8000" "$root\backend" `
    "`$env:PYTHONIOENCODING='utf-8'; cmd /c 'uv run uvicorn app.main:app --port 8000 2>&1' | Tee-Object -FilePath '$root\demo-backend.log'"
Open-Window "LarnTorHa frontend :3000" "$root\frontend" "npm run dev -- --port 3000"
Open-Window "LarnTorHa ngrok" $root "& '$ngrok' http 8000 --url=https://$domain"

Write-Host ""
Write-Host "Started. Open http://localhost:3000/login (0812345678 / demo-password)" -ForegroundColor Green
Write-Host "LINE webhook: https://$domain/v1/line/webhook"
Start-Sleep -Seconds 5
