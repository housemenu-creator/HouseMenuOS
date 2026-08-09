param(
  [int]$IntervalSeconds = 60
)

# tunnel-watchdog.ps1 — mantiene el tunnel cloudflared vivo y actualiza la URL en RTDB
# La API Gateway (forwardEvent) lee la URL de /tenants/portal/config/pipeline/n8n/url
# DispatchEvent ya apunta a la API Gateway fija.
#
# Uso: powershell -ExecutionPolicy Bypass -File scripts\tunnel-watchdog.ps1
# Para tarea programada: powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\Users\archiphone\.gemini\antigravity\House-Portal-OS\scripts\tunnel-watchdog.ps1"

$ProjectRoot = "C:\Users\archiphone\.gemini\antigravity\House-Portal-OS"
$LogFile = "$ProjectRoot\.tunnel-watchdog.log"
$TunnelUrlFile = "$ProjectRoot\.tunnel-url"
$ApiKey = "AIzaSyB4CXpSy6_DTgWpx5PNxa45rKQoxzqBz14"
$RtdbUrl = "https://house-menuapp-default-rtdb.firebaseio.com"
$ConfigPath = "/tenants/portal/config/pipeline/n8n/url"

function Log($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Write-Host $line
  Add-Content -Path $LogFile -Value $line
}

function Get-FirebaseToken {
  try {
    $body = '{"returnSecureToken":true}'
    $resp = curl.exe -s --max-time 10 "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$ApiKey" -X POST -H "Content-Type: application/json" -d $body
    $parsed = $resp | ConvertFrom-Json
    return $parsed.idToken
  } catch {
    return $null
  }
}

function Write-ConfigToRtdb($webhookUrl) {
  $token = Get-FirebaseToken
  if (-not $token) { Log "ERROR: No se pudo obtener Firebase token"; return $false }

  $json = '"{0}"' -f $webhookUrl
  $json | Set-Content "$env:TEMP\watchdog-url.json" -Encoding ascii -NoNewline

  try {
    $resp = curl.exe -s --max-time 10 "$RtdbUrl$ConfigPath.json?auth=$token" -X PUT -H "Content-Type: application/json" -d "@$env:TEMP\watchdog-url.json"
    $resp | Out-Null
    Log "URL actualizada en RTDB: $webhookUrl"
    return $true
  } catch {
    Log "ERROR: No se pudo escribir en RTDB: $_"
    return $false
  }
}

function Start-TunnelAndCaptureUrl {
  Log "Iniciando cloudflared..."

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "$ProjectRoot\cloudflared.exe"
  $psi.Arguments = "tunnel --url http://localhost:5678"
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.WorkingDirectory = $ProjectRoot

  try {
    $proc = [System.Diagnostics.Process]::Start($psi)
    $reader = $proc.StandardError

    # Leer stderr hasta capturar la URL
    while (-not $reader.EndOfStream) {
      $line = $reader.ReadLine()
      if ($line -match 'https://[a-zA-Z0-9-]+\.trycloudflare\.com') {
        $url = $matches[0]
        Log "Tunnel URL capturada: $url"
        $url | Out-File $TunnelUrlFile -Encoding ascii -NoNewline

        $n8nUrl = "$url/webhook/house-event"
        Write-ConfigToRtdb $n8nUrl
        Log "Watchdog listo. n8n URL: $n8nUrl"
        return
      }
    }
    Log "ERROR: No se encontró URL en la salida de cloudflared"
  } catch {
    Log "ERROR: No se pudo iniciar cloudflared: $_"
  }
}

# Loop principal
Log "=== TUNNEL WATCHDOG INICIADO (check cada ${IntervalSeconds}s) ==="

while ($true) {
  $cf = Get-Process -Name cloudflared -ErrorAction SilentlyContinue

  if (-not $cf) {
    Log "cloudflared no está corriendo. Re-iniciando..."
    Start-TunnelAndCaptureUrl
  } else {
    # Tunnel corriendo — verificar que la URL sigue siendo accesible
    if (Test-Path $TunnelUrlFile) {
      $savedUrl = Get-Content $TunnelUrlFile
      if ($savedUrl) {
        $healthUrl = "$savedUrl/healthz/"
        try {
          $resp = curl.exe -s --max-time 5 $healthUrl
          if ($resp -match "ok|status") {
            # Tunnel responde
          } else {
            Log "ADVERTENCIA: Tunnel responde pero inesperado: $resp"
          }
        } catch {
          Log "ADVERTENCIA: Tunnel no responde en $healthUrl"
        }
      }
    }
  }

  Start-Sleep -Seconds $IntervalSeconds
}
