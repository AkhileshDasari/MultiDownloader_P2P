# P2P Downloader PowerShell Startup Script
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Peer-to-Peer (P2P) Downloader System" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Ensure data/db directory exists
$dbPath = Join-Path $PSScriptRoot "data\db"
if (!(Test-Path $dbPath)) {
    New-Item -ItemType Directory -Path $dbPath -Force | Out-Null
    Write-Host " Created local database directory: $dbPath" -ForegroundColor Green
}

# 2. Check if MongoDB is running
$mongoActive = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 27017)
    $mongoActive = $true
    $tcp.Close()
} catch {
    $mongoActive = $false
}

if (-not $mongoActive) {
    Write-Host " Starting MongoDB daemon on 127.0.0.1:27017..." -ForegroundColor Yellow
    $mongoExe = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
    if (Test-Path $mongoExe) {
        Start-Process -FilePath $mongoExe -ArgumentList "--dbpath `"$dbPath`" --bind_ip 127.0.0.1 --port 27017" -WindowStyle Minimized
        Start-Sleep -Seconds 3
    } else {
        Write-Host " Warning: mongod.exe not found at standard path. Please ensure MongoDB is started." -ForegroundColor Red
    }
} else {
    Write-Host " MongoDB is already running on port 27017." -ForegroundColor Green
}

# 3. Start Node.js application
Write-Host ""
Write-Host " Starting P2P Downloader Web Server..." -ForegroundColor Cyan
Write-Host " App URL: http://localhost:5000" -ForegroundColor Green
Write-Host ""

node server.js

