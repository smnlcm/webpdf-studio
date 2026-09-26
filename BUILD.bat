@echo off
if exist "%~dp0out\WebPDF-Studio-v4.02-win32-x64\WebPDF-Studio-v4.02.exe" (
  start "" "%~dp0out\WebPDF-Studio-v4.02-win32-x64\WebPDF-Studio-v4.02.exe"
) else (
  npm install
  npm start
)
