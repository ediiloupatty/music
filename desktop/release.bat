@echo off
REM ── Build a shareable production Zenify.exe ──────────────────────────────────
REM Usage:  release.bat https://your-deployed-zenify-url
REM The URL is baked into the exe so end users just double-click it.

cd /d "%~dp0"

set "URL=%~1"
if "%URL%"=="" (
  echo.
  echo   Pakai: release.bat https://URL-ZENIFY-KAMU
  echo   ^(URL deploy produksi, harus https^)
  echo.
  pause
  exit /b 1
)

echo [1/3] Membuat icon dari logo...
go run mkicon.go ..\public\logo.png logo.ico
if errorlevel 1 ( echo GAGAL & pause & exit /b 1 )

echo [2/3] Meng-compile resource icon...
windres zenify.rc -O coff -o zenify.syso
if errorlevel 1 ( echo GAGAL - pastikan windres ada di PATH ^(C:\msys64\mingw64\bin^) & pause & exit /b 1 )

echo [3/3] Build zenify-desktop.exe ^(URL: %URL%^)...
set CGO_ENABLED=1
go build -ldflags="-H windowsgui -s -w -extldflags \"-static\" -X main.defaultURL=%URL%" -o zenify-desktop.exe .
if errorlevel 1 ( echo GAGAL & pause & exit /b 1 )

echo.
echo   Selesai!  -^>  %~dp0zenify-desktop.exe
echo   * Bagikan exe ini langsung, ATAU
echo   * buat installer: buka Zenify.iss di Inno Setup lalu Compile.
echo.
pause
