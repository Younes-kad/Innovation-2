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
if not exist "node_modules\expo-image-picker\package.json" goto install
if not exist "node_modules\@react-navigation\bottom-tabs\package.json" goto install
if not exist "node_modules\@expo\vector-icons\package.json" goto install
node -e "const p=require('./package.json');const e=require('expo/package.json');process.exit(e.version.split('.')[0]===p.dependencies.expo.match(/[0-9]+/)[0]?0:1)"
if errorlevel 1 goto install
goto start

:install
echo Installerer projektets pakker...
  call npm.cmd install
  if errorlevel 1 exit /b 1

:start
echo Starter Foothold i Expo Go. Stop med Ctrl+C.
call npm.cmd start -- %*
exit /b %errorlevel%
