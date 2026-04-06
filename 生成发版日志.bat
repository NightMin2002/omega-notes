@echo off
:: Set code page to UTF-8
chcp 65001 >nul

echo ===========================================
echo   Omega V2 - Auto Changelog Generator
echo ===========================================
echo.

node scripts/update-changelog.cjs

echo.
echo ===========================================
echo  Done! Press any key to exit.
echo  Opening RELEASE_NOTES.md in VS Code...
echo ===========================================
pause >nul
