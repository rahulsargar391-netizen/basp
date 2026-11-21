@echo off
title BASP - start
echo Starting the API and website. The API uses settings from server\.env.
start "BASP server" cmd /k "cd /d %~dp0server && npm run dev"
start "BASP website" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 8 >nul
start http://localhost:5173
