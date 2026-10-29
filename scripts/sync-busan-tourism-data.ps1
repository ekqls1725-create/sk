[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
$outputPath = Join-Path $projectRoot 'data\busan-attractions.json'
$endpoint = 'https://apis.data.go.kr/6260000/AttractionService/getAttractionKr'

if (-not (Test-Path -LiteralPath $envPath)) {
  throw '.env 파일이 없습니다. 먼저 scripts\register-busan-api-key.ps1을 실행하세요.'
}

$envLine = Get-Content -LiteralPath $envPath |
  Where-Object { $_ -match '^\s*BUSAN_TOURISM_API_KEY\s*=' } |
  Select-Object -First 1

if (-not $envLine) {
  throw '.env에 BUSAN_TOURISM_API_KEY 값이 없습니다.'
}

$serviceKey = ($envLine -replace '^\s*BUSAN_TOURISM_API_KEY\s*=\s*', '').Trim()
if (($serviceKey.StartsWith('"') -and $serviceKey.EndsWith('"')) -or
    ($serviceKey.StartsWith("'") -and $serviceKey.EndsWith("'"))) {
  $serviceKey = $serviceKey.Substring(1, $serviceKey.Length - 2)
}

if ([string]::IsNullOrWhiteSpace($serviceKey)) {
  throw 'BUSAN_TOURISM_API_KEY 값이 비어 있습니다.'
}

$pageSize = 100
$page = 1
$allItems = [System.Collections.Generic.List[object]]::new()
$totalCount = 0

do {
  $query = [ordered]@{
    ServiceKey = $serviceKey
    pageNo = $page
    numOfRows = $pageSize
    resultType = 'json'
  }

  $queryString = ($query.GetEnumerator() | ForEach-Object {
    '{0}={1}' -f [Uri]::EscapeDataString($_.Key), [Uri]::EscapeDataString([string]$_.Value)
  }) -join '&'

  $response = Invoke-RestMethod -Uri "$endpoint`?$queryString" -Method Get -TimeoutSec 30
  $apiRoot = $response.getAttractionKr
  if (-not $apiRoot) {
    $message = $response.response.header.resultMsg
    if (-not $message) { $message = 'API 응답 형식을 확인할 수 없습니다.' }
    throw $message
  }

  $items = @($apiRoot.item)
  foreach ($item in $items) {
    $allItems.Add([ordered]@{
      UC_SEQ = $item.UC_SEQ
      MAIN_TITLE = $item.MAIN_TITLE
      GUGUN_NM = $item.GUGUN_NM
      ADDR1 = $item.ADDR1
      MAIN_PLACE = $item.MAIN_PLACE
      PLACE = $item.PLACE
      TITLE = $item.TITLE
      SUBTITLE = $item.SUBTITLE
      ITEMCNTNTS = $item.ITEMCNTNTS
      CNTCT_TEL = $item.CNTCT_TEL
      HOMEPAGE_URL = $item.HOMEPAGE_URL
      USAGE_DAY = $item.USAGE_DAY
      USAGE_DAY_WEEK_AND_TIME = $item.USAGE_DAY_WEEK_AND_TIME
      HLDY_INFO = $item.HLDY_INFO
      USAGE_AMOUNT = $item.USAGE_AMOUNT
      TRFC_INFO = $item.TRFC_INFO
      MIDDLE_SIZE_RM1 = $item.MIDDLE_SIZE_RM1
      LAT = $item.LAT
      LNG = $item.LNG
      MAIN_IMG_NORMAL = $item.MAIN_IMG_NORMAL
      MAIN_IMG_THUMB = $item.MAIN_IMG_THUMB
    })
  }

  $totalCount = [int]$apiRoot.totalCount
  $page += 1
} while ($allItems.Count -lt $totalCount -and $items.Count -gt 0)

$publicSnapshot = [ordered]@{
  source = '부산광역시 부산명소정보 서비스'
  sourceUrl = 'https://data.busan.go.kr/bdip/opendata/detail.do?publicdatapk=15063481'
  updatedAt = (Get-Date).ToString('yyyy-MM-dd')
  items = $allItems
}

$publicSnapshot | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $outputPath -Encoding UTF8
Write-Host "$($allItems.Count)개 부산 명소 데이터를 갱신했습니다." -ForegroundColor Green
Write-Host 'API 키는 결과 파일에 포함되지 않았습니다.'
