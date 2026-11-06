# Ensure data directory exists
if (!(Test-Path -Path "data\db")) {
    New-Item -ItemType Directory -Path "data\db" -Force | Out-Null
}

Write-Host "🚀 Starting MongoDB daemon..." -ForegroundColor Cyan
Start-Process "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" -ArgumentList "--dbpath `"$PSScriptRoot\data\db`" --bind_ip 127.0.0.1 --port 27017" -WindowStyle Minimized

Start-Sleep -Seconds 2

Write-Host "🌐 Starting P2P Downloader Server..." -ForegroundColor Green
npm start
