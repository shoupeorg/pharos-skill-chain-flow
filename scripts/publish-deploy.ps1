$ErrorActionPreference="Stop"
$project=Split-Path -Parent $PSScriptRoot
Set-Location $project
npm.cmd ci
npm.cmd run check
if($LASTEXITCODE){throw "Verification failed."}
powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "deploy-cloudflare.ps1")
if($LASTEXITCODE){throw "Deployment failed."}

