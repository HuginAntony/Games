[CmdletBinding()]
param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDirectory

function Find-Pnpm {
    $bundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
    if (Test-Path -LiteralPath $bundled) {
        return @{ File = $bundled; Prefix = @() }
    }
    $installed = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
    if ($installed) { return @{ File = $installed.Source; Prefix = @() } }
    $corepack = Get-Command corepack.cmd -ErrorAction SilentlyContinue
    if ($corepack) { return @{ File = $corepack.Source; Prefix = @('pnpm') } }
    throw 'pnpm and Corepack were not found. Install Node.js LTS with Corepack, then run this file again.'
}

function Invoke-Pnpm {
    param([string[]]$Arguments)
    & $script:pnpm.File @($script:pnpm.Prefix) @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed: pnpm $($Arguments -join ' ') (exit $LASTEXITCODE)." }
}

try {
    Write-Host ''
    Write-Host 'WisQuiz multiplayer setup' -ForegroundColor Cyan
    Write-Host "Project: $projectDirectory"
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
        throw 'Node.js is missing from PATH. Install Node.js LTS and reopen this script.'
    }
    $script:pnpm = Find-Pnpm
    Write-Host "Package runner: $($script:pnpm.File)"
    Invoke-Pnpm -Arguments @('--version')
    $config = Get-Content -LiteralPath (Join-Path $projectDirectory 'wrangler.jsonc') -Raw
    if ($config -notmatch '"new_sqlite_classes"\s*:\s*\[\s*"Game"\s*\]') {
        throw 'The expected Free-compatible SQLite room migration is missing from wrangler.jsonc.'
    }
    if ($CheckOnly) {
        Write-Host 'Prerequisites found. No install, login or deployment was performed.' -ForegroundColor Green
        exit 0
    }

    Write-Host ''
    Write-Host 'Use your Cloudflare Workers Free account. This script does not upgrade your plan.'
    Write-Host 'Wrangler login opens a browser: sign in and approve access to your account.'
    Write-Host 'If Cloudflare asks for a paid upgrade, stop; the room uses Free-compatible SQLite storage.'
    Write-Host ''
    Write-Host '[1/4] Installing project dependencies...'
    Invoke-Pnpm -Arguments @('install', '--frozen-lockfile', '--node-linker=hoisted', '--package-import-method=copy')
    Write-Host '[2/4] Authorizing Cloudflare in your browser...'
    Invoke-Pnpm -Arguments @('exec', 'wrangler', 'login')
    Write-Host '[3/4] Checking the multiplayer bundle...'
    Invoke-Pnpm -Arguments @('deploy:check')
    Write-Host '[4/4] Publishing the multiplayer Worker...'
    $evidenceDirectory = Join-Path $projectDirectory '.validation-worker'
    New-Item -ItemType Directory -Path $evidenceDirectory -Force | Out-Null
    $deployLog = Join-Path $evidenceDirectory 'cloudflare-deploy.log'
    Invoke-Pnpm -Arguments @('deploy:party') | Tee-Object -FilePath $deployLog
    $output = Get-Content -LiteralPath $deployLog -Raw
    $match = [regex]::Match($output, 'https://(wisquiz-multiplayer\.[a-zA-Z0-9-]+\.workers\.dev)')
    if (-not $match.Success) {
        Write-Host 'Deployment command completed, but its workers.dev URL could not be extracted.' -ForegroundColor Yellow
        Write-Host "Find the Worker URL in Cloudflare Workers & Pages or in $deployLog."
        Write-Host 'Set NEXT_PUBLIC_MULTIPLAYER_HOST in Vercel to that hostname, then redeploy Vercel.'
        exit 1
    }
    $workerHost = $match.Groups[1].Value
    $healthUrl = "https://$workerHost/health"
    $healthy = $false
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 10
            if ($health.status -eq 'ok' -and $health.transport -eq 'partyserver') { $healthy = $true; break }
        } catch { }
        if ($attempt -lt 5) { Start-Sleep -Seconds 2 }
    }
    $variable = "NEXT_PUBLIC_MULTIPLAYER_HOST=$workerHost"
    $hostnameFile = Join-Path $evidenceDirectory 'multiplayer-host.txt'
    $variable | Set-Content -LiteralPath $hostnameFile -Encoding ASCII
    Write-Host ''
    if ($healthy) {
        Write-Host 'Cloudflare deployment and health check succeeded.' -ForegroundColor Green
    } else {
        Write-Host "Deployment completed, but health could not be verified. Check $healthUrl before proceeding." -ForegroundColor Yellow
    }
    Write-Host ''
    Write-Host 'Finish in Vercel:' -ForegroundColor Cyan
    Write-Host '1. Open your project > Settings > Environment Variables.'
    Write-Host "2. Add $variable" -ForegroundColor Green
    Write-Host '3. Select Production (and Preview if needed). Remove stale NEXT_PUBLIC_PARTYKIT_HOST values.'
    Write-Host '4. Redeploy the frontend so the new hostname is included in its build.'
    Write-Host '5. Host a fresh game and join from a second device or incognito browser.'
    Write-Host "The setting is also saved in: $hostnameFile"
    Write-Host 'Vercel settings are not changed by this script.'
    if (-not $healthy) { exit 1 }
    exit 0
} catch {
    Write-Host ''
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'Setup stopped. Resolve the error above and run Setup-Cloudflare.cmd again.'
    Write-Host 'See USAGE.md for Cloudflare and Vercel setup steps.'
    exit 1
}
