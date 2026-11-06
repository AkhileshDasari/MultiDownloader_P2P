@echo off
echo ========================================================
echo Starting P2P Downloader (MongoDB + Node.js Server)
echo ========================================================

:: 1. Ensure data directory exists
if not exist "data\db" mkdir "data\db"

:: 2. Start MongoDB in background
echo Starting MongoDB daemon...
start "MongoDB Server" /min "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "%~dp0data\db" --bind_ip 127.0.0.1 --port 27017

:: 3. Wait 2 seconds for MongoDB initialization
timeout /t 2 /nobreak >nul

:: 4. Start Node.js Server
echo Starting Node.js Server...
npm start
