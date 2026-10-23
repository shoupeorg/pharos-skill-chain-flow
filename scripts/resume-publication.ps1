$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
Set-Location $project
$safe = (Get-Location).Path

git -c "safe.directory=$safe" remote get-url origin *> $null
if ($LASTEXITCODE -ne 0) {
  git -c "safe.directory=$safe" remote add origin https://github.com/shoupeorg/pharos-skill-chain-flow.git
}

Write-Host "==> Publish verified source"
git -c "safe.directory=$safe" push -u origin main
if ($LASTEXITCODE -ne 0) { throw "GitHub publication failed with exit code $LASTEXITCODE." }

Write-Host "==> Deploy once with the existing Wrangler session"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "deploy-cloudflare.ps1")
if ($LASTEXITCODE -ne 0) { throw "Cloudflare deployment failed with exit code $LASTEXITCODE." }

git -c "safe.directory=$safe" add wrangler.jsonc
$pending = git -c "safe.directory=$safe" diff --cached --name-only
if ($pending) {
  git -c "safe.directory=$safe" commit -m "Configure deployed Cloudflare D1"
  if ($LASTEXITCODE -ne 0) { throw "Deployment configuration commit failed." }
  git -c "safe.directory=$safe" push origin main
  if ($LASTEXITCODE -ne 0) { throw "Final GitHub publication failed with exit code $LASTEXITCODE." }
}

$local = (git -c "safe.directory=$safe" rev-parse HEAD).Trim()
git -c "safe.directory=$safe" fetch origin main
if ($LASTEXITCODE -ne 0) { throw "Remote verification fetch failed." }
$remote = (git -c "safe.directory=$safe" rev-parse origin/main).Trim()
if ($local -ne $remote) { throw "Commit mismatch: local=$local remote=$remote" }

$base = "https://pharos-skill-chain-flow.shoupeorg.workers.dev"
$ui = Invoke-WebRequest -Uri "$base/" -UseBasicParsing -TimeoutSec 30
$meta = Invoke-RestMethod -Uri "$base/api/meta" -TimeoutSec 30
$manifest = Invoke-RestMethod -Uri "$base/evidence/manifest.json" -TimeoutSec 30
if ($ui.StatusCode -ne 200 -or -not $meta.readOnly -or -not $manifest.records) {
  throw "Public verification failed."
}

Write-Host ""
Write-Host "PUBLICATION AND DEPLOYMENT VERIFIED" -ForegroundColor Green
Write-Host "Commit:    $local"
Write-Host "Repository: https://github.com/shoupeorg/pharos-skill-chain-flow"
Write-Host "Demo:       $base"
Write-Host "Evidence:   $base/evidence/manifest.json"
