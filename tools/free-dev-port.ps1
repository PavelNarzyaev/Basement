$ErrorActionPreference = 'Stop'

$projectPath = Split-Path -Parent $PSScriptRoot
$vitePath = [System.IO.Path]::GetFullPath((Join-Path $projectPath 'node_modules/vite/bin/vite.js'))
$listenerProcessIds = @(Get-NetTCPConnection -State Listen |
    Where-Object LocalPort -EQ 5173 |
    Select-Object -ExpandProperty OwningProcess -Unique)

# Validate every listener before stopping any process.
$viteProcesses = foreach ($listenerProcessId in $listenerProcessIds) {
    $listenerProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $listenerProcessId"
    $commandMatch = [regex]::Match($listenerProcess.CommandLine, '^\s*(?:"[^"]+"|\S+)\s+(?:"(?<script>[^"]+)"|(?<script>\S+))(?<arguments>.*)$')
    # Custom Vite arguments can select another project's root or configuration.
    $isProjectVite = [System.IO.Path]::GetFileName($listenerProcess.ExecutablePath) -eq 'node.exe' -and
        $commandMatch.Success -and
        [System.IO.Path]::IsPathRooted($commandMatch.Groups['script'].Value) -and
        [System.IO.Path]::GetFullPath($commandMatch.Groups['script'].Value) -eq $vitePath -and
        $commandMatch.Groups['arguments'].Value -match '^\s*(?:--open\s+(?:true|false)\s*)?$'

    if (-not $isProjectVite) {
        throw "Port 5173 is occupied by another application (PID $listenerProcessId). It was not stopped."
    }

    Get-Process -Id $listenerProcessId
}

foreach ($viteProcess in $viteProcesses) {
    Write-Host "Stopping the previous Basement Vite server (PID $($viteProcess.Id)) on port 5173."
    $viteProcess.Kill()
    if (-not $viteProcess.WaitForExit(5000)) {
        throw "The previous Basement Vite server did not exit within 5 seconds."
    }
}
