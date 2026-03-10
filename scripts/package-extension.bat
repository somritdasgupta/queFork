@echo off
REM Chrome Extension Packaging Script for Windows
REM This script packages the Chrome extension into a ZIP file for release

setlocal enabledelayedexpansion

set EXTENSION_DIR=chrome-extension
set OUTPUT_DIR=releases
set SCRIPT_DIR=%~dp0

REM Extract version from manifest.json
for /f "tokens=2 delims=: " %%a in ('findstr /c:"version" %EXTENSION_DIR%\manifest.json') do (
    set VERSION=%%a
    set VERSION=!VERSION:"=!
    set VERSION=!VERSION:,=!
    goto found_version
)

:found_version
set ZIP_NAME=quefork-chrome-extension-v%VERSION%.zip

echo.
echo 📦 Packaging queFork Chrome Extension v%VERSION%...
echo.

REM Create output directory
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Remove old zip if exists
if exist "%OUTPUT_DIR%\%ZIP_NAME%" del "%OUTPUT_DIR%\%ZIP_NAME%"

REM Create zip file using PowerShell (Windows 10+)
powershell -NoProfile -Command ^
  "Add-Type -AssemblyName System.IO.Compression.FileSystem; ^
  [IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path '%EXTENSION_DIR%'), (Resolve-Path '%OUTPUT_DIR%') + '\%ZIP_NAME%')"

echo.
echo ✅ Extension packaged: %OUTPUT_DIR%\%ZIP_NAME%
echo.
echo 📝 Next steps:
echo 1. Upload this ZIP to Chrome Web Store
echo 2. Or create a GitHub release:
echo    git tag -a v%VERSION% -m "Chrome Extension v%VERSION%"
echo    git push origin v%VERSION%
echo.
echo ℹ️  Upload to Chrome Web Store:
echo    https://chrome.google.com/webstore/devconsole/
echo.

pause
