@echo off
title BASP - one-time setup
echo.
echo ===== BASP one-time setup =====
echo This installs the libraries. It needs internet and takes a few minutes.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)

echo [1/4] Installing server libraries...
cd /d "%~dp0server"
call npm install
if errorlevel 1 goto failed

echo [2/4] Creating server\.env with a random secret...
call node scripts/setup-env.js
if errorlevel 1 goto failed

echo [3/4] Installing website libraries...
cd /d "%~dp0client"
call npm install
if errorlevel 1 goto failed

echo [4/4] Creating client\.env...
if not exist ".env" copy ".env.example" ".env" >nul

echo.
echo Setup finished.
echo Configure Supabase settings in server\.env before starting BASP.
echo No MySQL or demo seed is required. Then run start.bat.
pause
exit /b 0

:failed
echo.
echo Something went wrong. Scroll up to read the red error, then send it to your guide.
pause
exit /b 1
