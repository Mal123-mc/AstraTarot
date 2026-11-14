#requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
$payload = Join-Path $dist 'payload'
$output = Join-Path $dist '星屿塔罗-安装程序-1.0.0.exe'

Write-Host 'Staging application files...' -ForegroundColor Cyan
if (Test-Path $payload) { Remove-Item $payload -Recurse -Force }
New-Item -ItemType Directory -Path $payload | Out-Null

$files = @(
  'index.html',
  'server.js',
  'sw.js',
  'manifest.webmanifest',
  '启动塔罗.bat',
  'README.md',
  'package.json'
)
foreach ($name in $files) {
  $source = Join-Path $root $name
  if (-not (Test-Path $source)) { throw "Missing file: $source" }
  Copy-Item $source (Join-Path $payload $name) -Force
}
foreach ($dir in @('css', 'js', 'icons')) {
  Copy-Item (Join-Path $root $dir) (Join-Path $payload $dir) -Recurse -Force
}

$node = $env:NODE_EXE
if (-not $node) {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCommand) { throw 'node.exe not found. Set NODE_EXE to a standalone node.exe.' }
  $node = $nodeCommand.Source
}
if (-not (Test-Path $node)) { throw "node.exe not found: $node" }
Copy-Item $node (Join-Path $payload 'node.exe') -Force

$python = $env:PYTHON
if (-not $python) {
  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCommand -and $pythonCommand.Source -notlike '*WindowsApps*') {
    $python = $pythonCommand.Source
  }
}
if ($python) {
  Write-Host 'Building installer artwork...' -ForegroundColor Cyan
  & $python (Join-Path $PSScriptRoot 'make-assets.py')
  if ($LASTEXITCODE -ne 0) { throw 'make-assets.py failed.' }
} else {
  Write-Host 'Python not found; using existing installer artwork.' -ForegroundColor Yellow
}

$makensisCandidates = @(
  'C:\Program Files (x86)\NSIS\makensis.exe',
  'C:\Program Files\NSIS\makensis.exe'
)
$makensis = $makensisCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $makensis) {
  $command = Get-Command makensis -ErrorAction SilentlyContinue
  if ($command) { $makensis = $command.Source }
}
if (-not $makensis) { throw 'makensis.exe not found. Install NSIS 3.x first.' }

if (Test-Path $output) { Remove-Item $output -Force }
Write-Host "Compiling installer with $makensis ..." -ForegroundColor Cyan
Push-Location $PSScriptRoot
try {
  & $makensis /V2 'installer.nsi'
  if ($LASTEXITCODE -ne 0) { throw "makensis failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

if (-not (Test-Path $output)) { throw "Installer was not created: $output" }
$item = Get-Item $output
$hash = (Get-FileHash $output -Algorithm SHA256).Hash

Write-Host ''
Write-Host "Installer: $($item.FullName)" -ForegroundColor Green
Write-Host ("Size:      {0:N1} MB" -f ($item.Length / 1MB))
Write-Host "SHA256:    $hash"
