$imagesDir = "e:\weding\images\foto_nikah"
$categories = @("pasangan", "orang_tua_wahyu", "orang_tua_desy", "keluarga_wahyu", "keluarga_desy", "teman", "tamu")
$jsArray = @()
$idCounter = 0

# Build a lookup of filenames already in subfolders, so we skip them from loose files
$subfolderFiles = @{}
foreach ($cat in $categories) {
    $subfolderPath = Join-Path -Path $imagesDir -ChildPath $cat
    if (Test-Path -Path $subfolderPath) {
        $files = Get-ChildItem -Path $subfolderPath -File -Include "*.jpeg","*.jpg","*.png","*.webp" -Recurse
        foreach ($file in $files) {
            $name = $file.Name.Replace('\', '/').Replace('"', '\"')
            $jsArray += "  { id: 'img-$idCounter', src: 'images/foto_nikah/$cat/$name', album: '$cat', isFavorite: false, addedAt: new Date(Date.now() - $($idCounter * 60000)).toISOString() }"
            $subfolderFiles[$file.Name] = $true
            $idCounter++
        }
    }
}

# Now scan loose files in main folder, skip those already in subfolders
$looseFiles = Get-ChildItem -Path $imagesDir -File -Include "*.jpeg","*.jpg","*.png","*.webp"
foreach ($file in $looseFiles) {
    if (-not $subfolderFiles.ContainsKey($file.Name)) {
        $name = $file.Name.Replace('\', '/').Replace('"', '\"')
        $jsArray += "  { id: 'img-$idCounter', src: 'images/foto_nikah/$name', album: 'tamu', isFavorite: false, addedAt: new Date(Date.now() - $($idCounter * 60000)).toISOString() }"
        $idCounter++
    }
}

$jsContent = "const photoData = [`n" + ($jsArray -join ",`n") + "`n];"
Set-Content -Path "e:\weding\data.js" -Value $jsContent -Encoding UTF8

Write-Host "Selesai! Ditemukan $idCounter foto total."
Write-Host "Foto pasangan: $(($jsArray | Where-Object { $_ -match "album: 'pasangan'" }).Count)"
Start-Sleep -Seconds 3
