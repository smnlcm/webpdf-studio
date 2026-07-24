param(
    [string]$Runtime = "win-x64"
)

$project = Join-Path $PSScriptRoot "src\HtmlToPdfGuiV2\HtmlToPdfGuiV2.csproj"
$output = Join-Path $PSScriptRoot "artifacts\publish\$Runtime"

dotnet publish $project `
    --configuration Release `
    --runtime $Runtime `
    --self-contained true `
    --output $output

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "V2 yayın çıktısı: $output"
