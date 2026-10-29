[CmdletBinding()]
param(
  [switch]$Clear
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'

if ($Clear) {
  if (Test-Path -LiteralPath $envPath) {
    Remove-Item -LiteralPath $envPath -Force
    Write-Host '로컬 .env API 키를 삭제했습니다.' -ForegroundColor Yellow
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

Write-Host '부산 관광 API 키를 로컬 .env에 등록했습니다.' -ForegroundColor Green
Write-Host '.env는 .gitignore에 포함되어 GitHub와 웹페이지에 업로드되지 않습니다.'
Write-Host '데이터를 갱신하려면 scripts\sync-busan-tourism-data.ps1을 실행하세요.'
