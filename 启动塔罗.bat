@echo off
chcp 65001 >nul
title 星屿塔罗 · Astra Tarot
cd /d "%~dp0"

if exist "%~dp0node.exe" (
  set "NODE=%~dp0node.exe"
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo.
    echo   没有找到 Node.js
    echo   请重新安装星屿塔罗，或安装 Node.js 后重试
    echo.
    pause
    exit /b 1
  )
  set "NODE=node"
)

echo.
echo   正在启动星屿塔罗，浏览器会自动打开...
echo   关闭这个窗口即可停止服务
echo.
"%NODE%" server.js
if errorlevel 1 pause
