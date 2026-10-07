@echo off
setlocal EnableExtensions
title Personal Blog - Local Server

cd /d "%~dp0"

set "NODE_EXE="
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE (
  for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
)

if not defined NODE_EXE goto :node_missing

netstat -ano | findstr /r /c:":5173 .*LISTENING" >nul
if not errorlevel 1 goto :already_running

echo.
echo Starting Personal Blog...
echo Open: http://127.0.0.1:5173
echo Keep this window open while using the local site.
echo.
start "" "http://127.0.0.1:5173"
"%NODE_EXE%" scripts\server.mjs

echo.
echo The local server stopped. Review the message above, then press any key to close.
pause >nul
exit /b 1

:already_running
echo.
echo A service is already using port 5173. Opening the blog in your browser...
start "" "http://127.0.0.1:5173"
echo.
echo Press any key to close this window.
pause >nul
exit /b 0

:node_missing
echo.
echo Node.js was not found. Install Node.js from https://nodejs.org/ and run this file again.
echo.
echo Press any key to close this window.
pause >nul
exit /b 1
