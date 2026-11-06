@echo off
title Peer-to-Peer Downloader Launcher
echo ========================================================
echo   Starting Peer-to-Peer (P2P) Downloader System
echo ========================================================
echo.

:: 1. Ensure data\db directory exists
if not exist "data\db" (
    echo Creating MongoDB data folder...
    mkdir "data\db"
)

:: 2. Check if MongoDB is already running on port 27017
netstat -ano | findstr 27017 >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting local MongoDB daemon on port 27017...
    if exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" (
        start "MongoDB Server" /min "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "%~dp0data\db" --bind_ip 127.0.0.1 --port 27017
        timeout /t 3 /nobreak >nul
    ) else (
        echo Warning: Default MongoDB path not found. Please ensure MongoDB is running.
    )
) else (
    echo MongoDB is already active on port 27017.
)

:: 3. Start Node.js Application Server
echo.
echo Starting P2P Downloader Web Server...
echo Web UI will be available at: http://localhost:5000
echo.
node server.js
pause

