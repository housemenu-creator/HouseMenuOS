# Enable trackStock + stock en todos los productos del catalogo
param(
    [string]$Branch = "monteverde",
    [string]$Project = "house-menuapp"
)

Write-Host "Leyendo productos de Firebase..."

$raw = firebase database:get /branches/$Branch/catalog/products --project $Project 2>$null | Out-String
$prods = $raw | ConvertFrom-Json

$updated = @{}
$rng = [Random]::new()
$lowStockCount = 0

foreach ($p in $prods.PSObject.Properties) {
    $name = $p.Name
    $product = $p.Value

    if ($product.trackStock -and $product.stock -gt 0) {
        $stock = $product.stock
    } else {
        $stock = $rng.Next(1, 50)
    }

    if ($stock -gt 5 -and $rng.Next(0, 10) -lt 2) {
        $stock = $rng.Next(1, 5)
    }

    if ($stock -le 5) { $lowStockCount++ }

    $obj = @{}
    foreach ($prop in $product.PSObject.Properties) {
        $obj[$prop.Name] = $prop.Value
    }
    $obj["trackStock"] = $true
    $obj["stock"] = $stock

    $updated[$name] = $obj
}

$json = $updated | ConvertTo-Json -Depth 10
Set-Content -Path "scripts/seed-product-stock.json" -Value $json -Encoding ASCII

Write-Host "Productos con trackStock=true: $($updated.Keys.Count)"
Write-Host "Con stock bajo (<=5): $lowStockCount"
Write-Host "Subiendo a Firebase..."

firebase database:set /branches/$Branch/catalog/products scripts/seed-product-stock.json --project $Project --force 2>$null

Write-Host "Listo!"
