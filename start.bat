@echo off
echo.
echo  启动美股恐慌仪表盘...
echo.
cd /d "%~dp0"
start "" "http://localhost:3000"
node server.js
