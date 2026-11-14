# 创建「星屿塔罗」桌面快捷方式（Windows）
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root '启动塔罗.bat'
$icon = Join-Path $root 'icons\astra-tarot-transparent.ico'

if (-not (Test-Path -LiteralPath $target)) {
  throw "找不到启动文件：$target"
}
if (-not (Test-Path -LiteralPath $icon)) {
  throw "找不到图标文件：$icon"
}

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop '星屿塔罗.lnk'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $root
$shortcut.IconLocation = "$icon,0"
$shortcut.Description = '星屿塔罗 · Astra Tarot'
$shortcut.WindowStyle = 1
$shortcut.Save()

Write-Host "快捷方式已创建：$shortcutPath"
