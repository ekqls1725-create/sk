[CmdletBinding()]
param(
  [switch]$Clear
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
$configPath = Join-Path $projectRoot 'js\busan-tourism-api.local.json'

if ($Clear) {
  $removed = $false
  foreach ($path in @($envPath, $configPath)) {
    if (Test-Path -LiteralPath $path) {
      Remove-Item -LiteralPath $path -Force
      $removed = $true
    }
  }

  if ($removed) {
    Write-Host '로컬 .env와 브라우저용 API 설정을 삭제했습니다.' -ForegroundColor Yellow
  } else {
    Write-Host '삭제할 로컬 API 키가 없습니다.' -ForegroundColor Yellow
  }
  exit 0
}

$secureKey = Read-Host '공공데이터포털 일반 인증키(Decoding)를 입력하세요' -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $serviceKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
}

if ([string]::IsNullOrWhiteSpace($serviceKey)) {
  throw 'API 키가 비어 있어 등록하지 않았습니다.'
}

$trimmedKey = $serviceKey.Trim()
$envLine = 'BUSAN_TOURISM_API_KEY="' + $trimmedKey.Replace('"', '\"') + '"'
Set-Content -LiteralPath $envPath -Value $envLine -Encoding UTF8

$browserConfig = [ordered]@{
  serviceKey = $trimmedKey
  updatedAt = (Get-Date).ToString('o')
}

$browserConfig | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
Write-Host '부산 관광 API 키를 .env에 등록하고 브라우저용 로컬 설정을 생성했습니다.' -ForegroundColor Green
Write-Host '.env와 생성된 설정 파일은 .gitignore에 포함되어 GitHub에 업로드되지 않습니다.'
