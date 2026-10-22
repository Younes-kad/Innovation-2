@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 exit /b 1
where node >nul 2>nul
if errorlevel 1 (
  for /d %%D in ("%LOCALAPPDATA%\FootholdTools\node-*-win-x64") do set "PATH=%%D;%PATH%"
)
where node >nul 2>nul
if errorlevel 1 (
  echo Installer Node.js LTS og proev igen.
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm blev ikke fundet. Installer Node.js LTS, og aabn en ny terminal.
  exit /b 1
)
if not exist "node_modules\.bin\expo.cmd" goto install
if not exist "node_modules\@react-native-async-storage\async-storage\package.json" goto install
goto start

:install
echo Installerer projektets pakker...
  call npm.cmd install
  if errorlevel 1 exit /b 1

:start
echo Starter Foothold i Expo Go. Stop med Ctrl+C.
call npm.cmd start -- %*
exit /b %errorlevel%
