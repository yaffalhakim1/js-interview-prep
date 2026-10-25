# Serves the course over your local network so you can read it on your phone.
#
# Usage:  pwsh -File serve.ps1
# Then open the printed http://<ip>:8000/ address on your phone (same Wi-Fi).
#
# Serving over HTTP rather than opening file:// on the phone matters: Android
# Chrome blocks localStorage for file:// URLs, so progress tracking would
# silently not persist.

param([int]$Port = 8000)

$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'html'

if (-not (Test-Path (Join-Path $root 'index.html'))) {
    throw "Cannot find html/index.html next to this script."
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -First 1).IPAddress

Write-Host ''
Write-Host '  JS Interview Prep — serving the course'
Write-Host ''
if ($ip) {
    Write-Host "  On your phone (same Wi-Fi):  http://${ip}:${Port}/" -ForegroundColor Green
}
Write-Host "  On this machine:             http://localhost:${Port}/" -ForegroundColor DarkGray
Write-Host ''
Write-Host '  If the phone cannot connect, allow Python through Windows Firewall'
Write-Host '  for Private networks, or check that both devices are on the same SSID.'
Write-Host ''
Write-Host '  Ctrl+C to stop.'
Write-Host ''

Push-Location $root
try {
    python -m http.server $Port --bind 0.0.0.0
}
finally {
    Pop-Location
}
