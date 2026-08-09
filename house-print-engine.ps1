# house-print-engine.ps1 — Launcher for the House Print Engine
# Usage:
#   .\house-print-engine.ps1 start      Start the server (background job)
#   .\house-print-engine.ps1 stop       Stop the server
#   .\house-print-engine.ps1 restart    Restart the server
#   .\house-print-engine.ps1 status     Check if running
#   .\house-print-engine.ps1 test       Print test ticket
#   .\house-print-engine.ps1 console    Run in foreground (for debugging)

param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'test', 'console')]
    [string]$Command = 'status'
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EngineDir = Split-Path -Parent $ScriptDir
$PackageDir = Join-Path $EngineDir "packages\print-engine"
$JobName = "HousePrintEngine"
$Port = 42784

function Get-EngineStatus {
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2 -ErrorAction Stop
        return @{ Running = $true; Status = $resp.printer_connected }
    } catch {
        return @{ Running = $false; Status = $null }
    }
}

switch ($Command) {
    'start' {
        $status = Get-EngineStatus
        if ($status.Running) {
            Write-Host "Print Engine ya está corriendo (http://127.0.0.1:$Port)" -ForegroundColor Yellow
            exit 0
        }

        $logFile = Join-Path $EngineDir "logs\print-engine.log"
        $null = New-Item -ItemType Directory -Path (Split-Path $logFile -Parent) -Force

        $jobArgs = @{
            FilePath         = "python"
            ArgumentList     = @("-m", "house_print_engine", "server")
            WorkingDirectory = $PackageDir
            WindowStyle      = "Hidden"
            PassThru         = $true
        }

        try {
            $process = Start-Process @jobArgs -NoNewWindow -RedirectStandardOutput $logFile -RedirectStandardError $logFile
            Start-Sleep -Seconds 2

            $status = Get-EngineStatus
            if ($status.Running) {
                Write-Host "Print Engine iniciado OK en http://127.0.0.1:$Port" -ForegroundColor Green
            } else {
                Write-Host "Print Engine iniciado pero no responde. Revisá logs:" -ForegroundColor Yellow
                Write-Host "  $logFile" -ForegroundColor Gray
            }
        } catch {
            Write-Host "Error al iniciar Print Engine: $_" -ForegroundColor Red
            exit 1
        }
    }

    'stop' {
        $status = Get-EngineStatus
        if (-not $status.Running) {
            Write-Host "Print Engine no está corriendo." -ForegroundColor Yellow
            exit 0
        }

        # Find python process with our port
        $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($conn) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) {
                $proc | Stop-Process -Force
                Write-Host "Print Engine detenido." -ForegroundColor Green
            }
        } else {
            Write-Host "No se encontró proceso en puerto $Port" -ForegroundColor Yellow
        }
    }

    'restart' {
        & $MyInvocation.MyCommand.Path stop
        Start-Sleep -Seconds 1
        & $MyInvocation.MyCommand.Path start
    }

    'status' {
        $status = Get-EngineStatus
        if ($status.Running) {
            Write-Host "Print Engine: CORRIENDO" -ForegroundColor Green
            Write-Host "  URL: http://127.0.0.1:$Port/health"
            Write-Host "  Printer: $($status.Status)"
        } else {
            Write-Host "Print Engine: DETENIDO" -ForegroundColor Red
        }
    }

    'test' {
        $body = '{}' | ConvertTo-Json
        try {
            $resp = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/print/test" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
            if ($resp.success) {
                Write-Host "Test ticket impreso! ($($resp.bytes_written) bytes)" -ForegroundColor Green
            } else {
                Write-Host "Error: $($resp.error)" -ForegroundColor Red
            }
        } catch {
            Write-Host "Error de conexión: $_" -ForegroundColor Red
            Write-Host "Asegurate de que el servidor esté corriendo (start)" -ForegroundColor Yellow
        }
    }

    'console' {
        Write-Host "Iniciando Print Engine en consola (Ctrl+C para salir)..." -ForegroundColor Cyan
        Push-Location $PackageDir
        python -m house_print_engine server
        Pop-Location
    }
}
