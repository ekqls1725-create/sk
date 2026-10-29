[CmdletBinding()]
param(
  [switch]$Clear
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectRoot 'js\busan-tourism-api.local.json'

if ($Clear) {
  if (Test-Path -LiteralPath $configPath) {
    Remove-Item -LiteralPath $configPath -Force
    Write-Host '로컬 부산 관광 API 키를 삭제했습니다.' -ForegroundColor Yellow
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

$config = [ordered]@{
  serviceKey = $serviceKey.Trim()
  updatedAt = (Get-Date).ToString('o')
}

$config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
Write-Host '부산 관광 API 키를 로컬 설정에 등록했습니다.' -ForegroundColor Green
Write-Host '이 파일은 .gitignore에 포함되어 GitHub에 업로드되지 않습니다.'
