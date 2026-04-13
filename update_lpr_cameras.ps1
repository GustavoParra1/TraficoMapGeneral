# Define file paths
$csvFile = "C:\Users\gparra\MapaTraficoFinal\public\Camaras.CSV1.csv"
$geoJsonFile = "C:\Users\gparra\TraficoMapGeneral\public\data\cameras.geojson"

Write-Host "=" * 70
Write-Host "STEP 1: Reading CSV file and extracting LPR camera numbers"
Write-Host "=" * 70

# Read and parse CSV
$csvContent = Get-Content -Path $csvFile -Raw
$lines = $csvContent -split "`n"
$headerLine = $lines[0]
$headers = $headerLine -split ","

# Find column indices
$nCamaraIndex = $headers.IndexOf(" N CAMARA")
$lprIndex = $headers.IndexOf("LPR")

if ($nCamaraIndex -eq -1) { $nCamaraIndex = $headers.IndexOf("N CAMARA") }

Write-Host "N CAMARA column index: $nCamaraIndex"
Write-Host "LPR column index: $lprIndex"

# Extract LPR cameras
$lprCameras = @()
$cameraDetails = @{}

for ($i = 1; $i -lt $lines.Count; $i++) {
    $line = $lines[$i].Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    
    # Split by comma but preserve quoted values
    $parts = $line -split '(?<=(?:^|,)(?:[^"]*"[^"]*")*[^",]*),(?=(?:[^"]*"[^"]*")*[^"]*$)'
    
    if ($parts.Count -gt [Math]::Max($nCamaraIndex, $lprIndex)) {
        $cameraNum = $parts[$nCamaraIndex].Trim().Trim('"')
        $lprValue = $parts[$lprIndex].Trim().Trim('"')
        
        if (-not [string]::IsNullOrWhiteSpace($cameraNum) -and -not [string]::IsNullOrWhiteSpace($lprValue)) {
            if ($lprCameras -notcontains $cameraNum) {
                $lprCameras += $cameraNum
            }
            if (-not $cameraDetails.ContainsKey($cameraNum)) {
                $cameraDetails[$cameraNum] = @()
            }
            $cameraDetails[$cameraNum] += $lprValue
        }
    }
}

# Sort camera numbers
$sortedCameras = $lprCameras | Sort-Object { [int]$_ } -ErrorAction SilentlyContinue

Write-Host "`nTotal unique LPR cameras found in CSV: $($lprCameras.Count)"
Write-Host "Camera numbers with LPR: $($sortedCameras -join ', ')"

Write-Host ("`n" + "=" * 70)
Write-Host "STEP 2: Reading existing cameras.geojson"
Write-Host "=" * 70

$geoJsonContent = Get-Content -Path $geoJsonFile -Raw
$geoJsonData = ConvertFrom-Json $geoJsonContent

# Count LPR cameras before update
$beforeCount = @($geoJsonData.features | Where-Object { $_.properties.lpr -eq 1 }).Count

Write-Host "LPR cameras in GeoJSON before update: $beforeCount"

Write-Host ("`n" + "=" * 70)
Write-Host "STEP 3: Updating GeoJSON with LPR flag"
Write-Host "=" * 70

$updatedCount = 0
foreach ($feature in $geoJsonData.features) {
    $cameraNum = $feature.properties.camera_number.ToString().Trim()
    
    if ($lprCameras -contains $cameraNum) {
        $feature.properties.lpr = 1
        $updatedCount++
    }
}

Write-Host "Features updated with lpr = 1: $updatedCount"

# Count LPR cameras after update
$afterCount = @($geoJsonData.features | Where-Object { $_.properties.lpr -eq 1 }).Count

Write-Host "LPR cameras in GeoJSON after update: $afterCount"

Write-Host ("`n" + "=" * 70)
Write-Host "STEP 4: Writing updated GeoJSON back to file"
Write-Host "=" * 70

$geoJsonData | ConvertTo-Json -Depth 100 | Set-Content -Path $geoJsonFile
Write-Host "Updated file saved: $geoJsonFile"

Write-Host ("`n" + "=" * 70)
Write-Host "SUMMARY"
Write-Host "=" * 70
Write-Host "✓ LPR cameras found in CSV: $($lprCameras.Count)"
Write-Host "✓ Camera numbers: $($sortedCameras -join ', ')"
Write-Host "✓ Before update: $beforeCount LPR cameras in GeoJSON"
Write-Host "✓ After update: $afterCount LPR cameras in GeoJSON"
Write-Host "✓ Features updated: $updatedCount"
Write-Host "✓ File saved successfully: $geoJsonFile"
Write-Host "=" * 70
