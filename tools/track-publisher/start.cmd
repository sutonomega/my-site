@echo off
where py >nul 2>&1
if errorlevel 1 (
    python "%~dp0app.py"
) else (
    py -3 "%~dp0app.py"
)
if errorlevel 1 pause
