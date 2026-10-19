@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  ============================================
echo    GymBro.AI 啟動中...
echo  ============================================
echo.

where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo 用 Python 啟動伺服器...
  python -m http.server 8000
  goto :end
)

echo  搵唔到 Node.js 或 Python。
echo  請先安裝 Node.js（https://nodejs.org），
echo  或者直接用瀏覽器開啟 index.html（但拍照/語音需要透過伺服器）。
echo.
pause

:end
