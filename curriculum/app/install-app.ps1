<#
  Career Book — desktop app installer

  Creates a Desktop (and Start Menu) shortcut that opens the compiled reader
  in a chromeless browser window, so it behaves like a native application:
  no address bar, no tabs, its own taskbar entry and icon, and its own browser
  profile so your reading progress is never cleared by normal browsing.

  Run:  powershell -ExecutionPolicy Bypass -File app\install-app.ps1
#>

$ErrorActionPreference = 'Stop'

$AppDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root     = Split-Path -Parent $AppDir
$Index    = Join-Path $Root 'output\index.html'
$Icon     = Join-Path $AppDir 'career-book.ico'
$Profile  = Join-Path $AppDir 'profile'
$AppName  = 'Career Book'

Write-Host ''
Write-Host '  Career Book - installing desktop app' -ForegroundColor Cyan
Write-Host '  ------------------------------------'

if (-not (Test-Path $Index)) {
  throw "Reader not built. Run 'node compile.js --html-only' first. Missing: $Index"
}
if (-not (Test-Path $Icon)) {
  throw "Icon missing. Run 'node app/make-icon.js' first. Missing: $Icon"
}

# ── Find a Chromium-based browser (app mode needs one) ──────────
$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe"
)

$Browser = $null
foreach ($c in $candidates) { if (Test-Path $c) { $Browser = $c; break } }
if (-not $Browser) { throw 'No Chromium-based browser found (Chrome, Edge, or Brave required).' }

Write-Host "  Browser : $Browser"

if (-not (Test-Path $Profile)) { New-Item -ItemType Directory -Path $Profile | Out-Null }

# file:/// URL with forward slashes
$Url = 'file:///' + ($Index -replace '\\', '/')

$AppArgs = @(
  "--app=$Url"
  "--user-data-dir=`"$Profile`""
  '--window-size=1500,940'
  '--no-first-run'
  '--no-default-browser-check'
  '--disable-features=Translate,MediaRouter'
) -join ' '

# ── Create the shortcuts ────────────────────────────────────────
$shell = New-Object -ComObject WScript.Shell

function New-AppShortcut([string]$LinkPath) {
  if (Test-Path $LinkPath) { Remove-Item $LinkPath -Force }
  $sc = $shell.CreateShortcut($LinkPath)
  $sc.TargetPath       = $Browser
  $sc.Arguments        = $AppArgs
  $sc.WorkingDirectory = $Root
  $sc.IconLocation     = "$Icon,0"
  $sc.Description      = 'Software Engineering Mastery - 137-day plan, 145 chapters'
  $sc.WindowStyle      = 1
  $sc.Save()
  Write-Host "  Created : $LinkPath" -ForegroundColor Green
}

$desktop = [Environment]::GetFolderPath('Desktop')
New-AppShortcut (Join-Path $desktop "$AppName.lnk")

$startMenu = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'Microsoft\Windows\Start Menu\Programs'
if (Test-Path $startMenu) { New-AppShortcut (Join-Path $startMenu "$AppName.lnk") }

Write-Host ''
Write-Host '  Done. Open "Career Book" from your Desktop.' -ForegroundColor Cyan
Write-Host '  Tip: right-click the taskbar icon while it runs to pin it.'
Write-Host ''
