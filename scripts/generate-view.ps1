param(
  [Parameter(Mandatory=$true)]
  [string]$Pattern,

  [Parameter(Mandatory=$true)]
  [string]$Name,

  [Parameter(Mandatory=$true)]
  [string]$Out
)

$templatesDir = Join-Path $PSScriptRoot "..\docs\clean-minimalist\templates"
$templateMap = @{
  "layout"    = "01-layout-shell.jsx"
  "dashboard" = "02-dashboard.jsx"
  "list"      = "03-list-datatable.jsx"
  "detail"    = "04-detail-view.jsx"
  "form"      = "05-form-wizard.jsx"
  "kanban"    = "06-kanban-board.jsx"
  "grid"      = "07-card-grid.jsx"
  "chat"      = "08-conversation.jsx"
  "game"      = "09-game-phase.jsx"
  "service"   = "10-single-page-service.jsx"
}

if (-not $templateMap.ContainsKey($Pattern)) {
  Write-Error "Patrón no válido. Usa uno de: $($templateMap.Keys -join ', ')"
  exit 1
}

$templateFile = Join-Path $templatesDir $templateMap[$Pattern]
$outDir = Join-Path (Resolve-Path ".") $Out
$outFile = Join-Path $outDir "$Name.jsx"

if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$content = Get-Content $templateFile -Raw
$content = $content -replace 'export default function \w+', "export default function $Name"

Set-Content -Path $outFile -Value $content

Write-Output "✅ Vista '$Name' creada desde template '$Pattern'"
Write-Output "   $outFile"
