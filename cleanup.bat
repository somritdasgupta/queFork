REM filepath: /c/Projects/queFork/cleanup.bat
@echo off
setlocal enabledelayedexpansion

echo [Starting cleanup process...]

REM Kill any running Node processes that might lock files
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [Attempting to remove .next directory...]

IF EXIST ".next" (
    REM Reset permissions recursively
    echo [Resetting permissions...]
    icacls ".next" /reset /T /Q >nul 2>&1
    
    REM Remove read-only attributes
    echo [Removing read-only attributes...]
    attrib -R ".next\*.*" /S /D

    REM First attempt: normal delete
    echo [First cleanup attempt...]
    rd /s /q ".next" 2>nul
    
    IF EXIST ".next" (
        echo [First attempt failed, trying force cleanup...]
        
        REM Second attempt: force delete files first
        del /f /s /q ".next\*.*" >nul 2>&1
        rd /s /q ".next" 2>nul
        
        IF EXIST ".next" (
            echo [ERROR] Failed to remove .next directory
            echo [ERROR] Please close any applications that might be using the directory
            echo [ERROR] and try again
            exit /b 1
        )
    )
    
    echo [Successfully removed .next directory]
) ELSE (
    echo [.next directory not found, nothing to clean]
)

echo [Cleanup completed successfully]
exit /b 0