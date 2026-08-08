$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BundledRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
$PythonCommand = Get-Command python -ErrorAction SilentlyContinue
$NodeExecutable = if ($NodeCommand) { $NodeCommand.Source } else { Join-Path $BundledRoot "node\bin\node.exe" }
$PythonExecutable = if ($PythonCommand -and $PythonCommand.Source -notlike "*WindowsApps*") { $PythonCommand.Source } else { Join-Path $BundledRoot "python\python.exe" }

if (-not (Test-Path $NodeExecutable)) { throw "Node.js was not found. Install Node.js or configure it on PATH." }
if (-not (Test-Path $PythonExecutable)) { throw "Python was not found. Install Python or configure it on PATH." }

$JavaScriptFiles = Get-ChildItem -Path (Join-Path $ProjectRoot "frontend\js") -Filter "*.js"
foreach ($File in $JavaScriptFiles) {
    & $NodeExecutable --check $File.FullName
    if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax check failed: $($File.Name)" }
}

& $NodeExecutable (Join-Path $ProjectRoot "frontend\tests\auth-guard.test.js")
if ($LASTEXITCODE -ne 0) { throw "Frontend authentication guard tests failed." }

Push-Location $ProjectRoot
try {
    & $PythonExecutable -m unittest discover backend/tests -v
    if ($LASTEXITCODE -ne 0) { throw "Backend tests failed." }
    & terraform -chdir=terraform fmt -check -recursive
    if ($LASTEXITCODE -ne 0) { throw "Terraform formatting check failed." }
    & terraform -chdir=terraform validate
    if ($LASTEXITCODE -ne 0) { throw "Terraform validation failed." }
}
finally {
    Pop-Location
}

Write-Output "All Project 06 checks passed."
