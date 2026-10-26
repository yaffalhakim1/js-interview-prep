# Builds every edition from the HTML source.
#
#   1. markdown edition  (md/ and COURSE.md)
#   2. PDF, pass 1       render, then find which page each topic landed on
#   3. PDF, pass 2       render again with those page numbers in the contents
#   4. PDF outline       write a clean two-level bookmark tree
#
# Usage:  pwsh -File build-all.ps1

$ErrorActionPreference = 'Stop'

$root   = $PSScriptRoot
$html   = Join-Path $root 'html'
$pdf    = Join-Path $root 'JavaScript-Interview-Prep.pdf'
$source = Join-Path $html 'print\js-interview-prep.html'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'

if (-not (Test-Path $chrome)) {
    $chrome = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
}
if (-not (Test-Path $chrome)) {
    throw 'Neither Chrome nor Edge was found. Install one, or print the HTML manually with Ctrl+P.'
}

Write-Host 'markdown edition'
node (Join-Path $root 'tools\build-md.js')
node (Join-Path $root 'tools\check-md.js')
if ($LASTEXITCODE -ne 0) { throw 'markdown check failed' }
node (Join-Path $root 'tools\check-tidy.js')
if ($LASTEXITCODE -ne 0) { throw 'markdown tidy check failed' }

function Render-Pdf {
    $profile = Join-Path $env:TEMP ('jspbuild-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $profile | Out-Null
    $uri = 'file:///' + ($source -replace '\\', '/')
    & $chrome --headless=new --disable-gpu --no-sandbox --user-data-dir="$profile" `
        --no-pdf-header-footer --virtual-time-budget=25000 `
        --print-to-pdf="$pdf" "$uri" 2>&1 | Out-Null
    Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue
    if (-not (Test-Path $pdf)) { throw 'PDF was not produced.' }
}

Write-Host 'pass 1 — rendering to find topic pages'
Push-Location $html
node build-print.js | Out-Null
Pop-Location
Render-Pdf
python (Join-Path $root 'fill-toc-pages.py')

Write-Host 'pass 2 — rendering with page numbers'
Push-Location $html
node build-print.js | Out-Null
Pop-Location
Render-Pdf

Write-Host 'pass 3 — writing the PDF outline'
python (Join-Path $root 'make-toc.py')

$size = [math]::Round((Get-Item $pdf).Length / 1MB, 2)
Write-Host "done: $pdf ($size MB)"
