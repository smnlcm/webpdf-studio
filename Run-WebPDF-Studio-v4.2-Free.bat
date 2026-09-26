@echo off
if exist "%~dp0cross-platform\out\WebPDF-Studio-v4.02-win32-x64\WebPDF-Studio-v4.02.exe" (
  start "" "%~dp0cross-platform\out\WebPDF-Studio-v4.02-win32-x64\WebPDF-Studio-v4.02.exe"
) else if exist "%~dp0cross-platform\dist\WebPDF Studio 4.0.1.exe" (
  start "" "%~dp0cross-platform\dist\WebPDF Studio 4.0.1.exe"
) else (
  cd /d "%~dp0cross-platform"
  start cmd.exe /c "npm start"
)
