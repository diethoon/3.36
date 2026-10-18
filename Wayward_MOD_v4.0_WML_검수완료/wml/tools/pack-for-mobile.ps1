# Packs the game folder for the WML Player phone app: the game (html, wml with its mods, picture lists) and the
# pictures, as two files. Run by 모바일로_묶기.cmd / pack-for-mobile.cmd in the game folder, which pass their own path:
# its folder is the game folder and its file name picks the language. Run on its own, it packs the game folder two
# levels up (this file lives in wml\tools).
param([string]$Launcher = '')
$f = if ($Launcher) { $Launcher } else { Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'pack-for-mobile.cmd' }
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
$lang = if ([IO.Path]::GetFileName($f) -match '^[ -~]+$') { 'en' } else { 'ko' }
$txt = @{
  ko = @{
    title     = '모바일용 묶음 만들기 (WML 플레이어)'
    notar     = 'Windows에 tar.exe 가 없어요. Windows 10(1803 이후)이나 11에서 실행해 주세요.'
    nohtml    = '이 폴더에 게임 html 파일이 없어요: {0}  - 이 파일을 게임 폴더(html 옆)에 두고 실행하세요.'
    modlist   = '[1/4] 모드 목록(mods.js)을 폴더와 맞추는 중...'
    nolist    = '[1/4] 모드 목록 맞추기 파일이 없어서 건너뛰어요.'
    stateHit  = '[2/4] 세이브·설정 파일을 찾았어요: {0}  ({1})'
    stateAsk  = '      게임 묶음에 같이 넣을까요? 폰에서 처음 켤 때 가져와요. [Y/n]'
    stateNone = '[2/4] 세이브·설정 파일(wml-state-*.json)이 없어요. 세이브를 옮기려면 게임의 WML 관리자 > 옮기기·백업 > 내보내기 를 먼저 하세요. (없어도 묶음은 만들어요)'
    stateIn   = '      넣었어요.'
    game      = '[3/4] 게임 묶음 만드는 중...'
    gameDone  = '      {0}  ({1})'
    imgSame   = '[4/4] 그림이 지난 묶음 뒤로 바뀌지 않았어요: {0} 를 그대로 쓰면 돼요. (새로 만들려면 그 파일을 지우고 다시 실행)'
    imgNone   = '[4/4] images 폴더가 없어서 그림 묶음은 건너뛰어요.'
    imgCount  = '[4/4] 그림 {0}개 ({1}) 확인했어요.'
    imgMake   = '      그림 묶음 만드는 중... 몇 분 걸려요.'
    imgSpace  = '      디스크 공간이 모자라요: {0} 필요, {1} 남음. 그림 묶음을 건너뛰어요.'
    imgDone   = '      {0}  ({1})'
    progress  = '그림 묶음'
    removed   = '      예전 묶음 지움: {0}'
    done      = '다 됐어요. 폰으로 옮길 파일은 이 폴더에 있어요: {0}'
    next1     = ' 1. 두 파일을 폰에 복사해요 (USB, SD카드, 클라우드 아무거나).'
    next2     = ' 2. 폰의 WML 플레이어에서 [게임 묶음 고르기] / [그림 묶음 추가] 로 한 번씩 골라요.'
    next3     = ' 3. 모드를 바꾸면 이 파일을 다시 실행하고, 새 게임 묶음만 다시 고르면 돼요.'
    failed    = '실패했어요: {0}'
  }
  en = @{
    title     = 'Packing for mobile (WML Player)'
    notar     = 'tar.exe is missing. Run this on Windows 10 (1803 or later) or 11.'
    nohtml    = 'No game html file in this folder: {0}  - put this file in the game folder (next to the html) and run it there.'
    modlist   = '[1/4] Syncing the mod list (mods.js) with the folders...'
    nolist    = '[1/4] No mod list updater found; skipped.'
    stateHit  = '[2/4] Found a saves/settings file: {0}  ({1})'
    stateAsk  = '      Put it in the game bundle? The phone takes it in on the first start. [Y/n]'
    stateNone = '[2/4] No saves/settings file (wml-state-*.json). To move saves, first use WML manager > Move / back up > Export in the game. (The bundle is made anyway.)'
    stateIn   = '      Added.'
    game      = '[3/4] Making the game bundle...'
    gameDone  = '      {0}  ({1})'
    imgSame   = '[4/4] No picture changed since the last bundle: keep using {0}. (To make it again, delete that file and run this again.)'
    imgNone   = '[4/4] No images folder; no picture bundle.'
    imgCount  = '[4/4] Checked {0} pictures ({1}).'
    imgMake   = '      Making the picture bundle... this takes a few minutes.'
    imgSpace  = '      Not enough disk space: {0} needed, {1} free. Skipping the picture bundle.'
    imgDone   = '      {0}  ({1})'
    progress  = 'Picture bundle'
    removed   = '      Removed the older bundle: {0}'
    done      = 'Done. The files for the phone are in: {0}'
    next1     = ' 1. Copy both files to the phone (USB, SD card, cloud - any way).'
    next2     = ' 2. In WML Player on the phone, pick each once: [Pick a game bundle] / [Add a picture bundle].'
    next3     = ' 3. After changing mods, run this again and pick only the new game bundle.'
    failed    = 'Failed: {0}'
  }
}[$lang]
function Say([string]$key, [object[]]$fill = @()) { Write-Host ($txt[$key] -f $fill) }
function Size([double]$n) { if ($n -ge 1GB) { '{0:N2}GB' -f ($n / 1GB) } elseif ($n -ge 1MB) { '{0:N1}MB' -f ($n / 1MB) } else { '{0:N0}KB' -f ($n / 1KB) } }

try {
  $root = Split-Path -Parent $f
  $tarExe = Join-Path $env:SystemRoot 'System32\tar.exe'
  Write-Host ''
  Write-Host $txt.title
  Write-Host '------------------------------------------'
  if (-not (Test-Path -LiteralPath $tarExe)) { Say 'notar'; return }
  if (-not @(Get-ChildItem -LiteralPath $root -Filter '*.html' -File).Count) { Say 'nohtml' @($root); return }
  $outName = if ($lang -eq 'ko') { '모바일용' } else { 'for-mobile' }
  $out = Join-Path $root $outName
  New-Item -ItemType Directory -Force -Path $out | Out-Null
  $stamp = Get-Date -Format 'yyyy-MM-dd-HHmm'

  # 1. mods.js in step with the mod folders
  $updater = @('모드목록_자동갱신.cmd', 'update-mod-list.cmd') | ForEach-Object { Join-Path $root "wml\mods\$_" } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($updater) {
    Say 'modlist'
    $env:WML_NOPAUSE = '1'
    & cmd.exe /d /c "`"$updater`"" | ForEach-Object { Write-Host "      $_" }
    Remove-Item Env:WML_NOPAUSE -ErrorAction SilentlyContinue
  } else { Say 'nolist' }

  # 2. saves/settings exported from the game (WML manager): the newest wml-state-*.json in Downloads or here
  $downloads = try { (New-Object -ComObject Shell.Application).NameSpace('shell:Downloads').Self.Path } catch { Join-Path $env:USERPROFILE 'Downloads' }
  $state = @($root, $downloads) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } |
    ForEach-Object { Get-ChildItem -LiteralPath $_ -Filter 'wml-state-*.json' -File -ErrorAction SilentlyContinue } |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $stateDir = $null
  if ($state) {
    Say 'stateHit' @($state.FullName, $state.LastWriteTime.ToString('yyyy-MM-dd HH:mm'))
    $ans = Read-Host $txt.stateAsk
    if ($ans -eq '' -or $ans -match '^\s*[yY]') {
      $stateDir = Join-Path $env:TEMP "wml-mobile-$PID"
      New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
      Copy-Item -LiteralPath $state.FullName -Destination (Join-Path $stateDir 'wml-state.json') -Force
      Say 'stateIn'
    }
  } else { Say 'stateNone' }

  # 3. game bundle: the game folder without the pictures, the picture server tool and leftovers
  Say 'game'
  $skipTop = @('images', 'wayward-imagegen', '모바일용', 'for-mobile', 'node_modules')
  $items = @(Get-ChildItem -LiteralPath $root -Force | Where-Object {
      $n = $_.Name
      ($skipTop -notcontains $n) -and -not $n.StartsWith('.') -and
      $n -notmatch '\.(cmd|bat|zip|tar|7z|rar|exe|bak)$' -and $n -notmatch '^(Thumbs\.db|desktop\.ini|wml-state.*\.json)$'
    } | ForEach-Object { $_.Name })
  $gameTar = Join-Path $out "wayward-game-$stamp.tar"
  $tarArgs = @('-c', '-f', $gameTar, '--exclude', '*.bak', '--exclude', '*.cmd', '--exclude', 'node_modules', '--exclude', 'wml/mcp', '-C', $root) + $items
  if ($stateDir) { $tarArgs += @('-C', $stateDir, 'wml-state.json') }
  & $tarExe @tarArgs
  if ($LASTEXITCODE -ne 0) { throw "tar ($LASTEXITCODE)" }
  if ($stateDir) { Remove-Item -LiteralPath $stateDir -Recurse -Force -ErrorAction SilentlyContinue }
  Say 'gameDone' @((Split-Path -Leaf $gameTar), (Size (Get-Item -LiteralPath $gameTar).Length))
  Get-ChildItem -LiteralPath $out -Filter 'wayward-game-*.tar' -File | Where-Object { $_.FullName -ne $gameTar } | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force; Say 'removed' @($_.Name) }

  # 4. picture bundle: only when a picture changed since the last one
  $img = Join-Path $root 'images'
  $imgTar = $null
  if (-not (Test-Path -LiteralPath $img)) { Say 'imgNone' }
  else {
    $count = 0; $bytes = [long]0; $newest = [datetime]::MinValue
    foreach ($fi in ([IO.DirectoryInfo]$img).EnumerateFiles('*', [IO.SearchOption]::AllDirectories)) {
      $count++; $bytes += $fi.Length
      if ($fi.LastWriteTime -gt $newest) { $newest = $fi.LastWriteTime }
    }
    Say 'imgCount' @($count.ToString('N0'), (Size $bytes))
    $last = Get-ChildItem -LiteralPath $out -Filter 'wayward-images-*.tar' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($last -and $newest -lt $last.LastWriteTime) { Say 'imgSame' @($last.Name); $imgTar = $last.FullName }
    else {
      $free = (New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($out))).AvailableFreeSpace
      $need = [long]($bytes * 1.05) + 200MB
      if ($free -lt $need) { Say 'imgSpace' @((Size $need), (Size $free)) }
      else {
        Say 'imgMake'
        $imgTar = Join-Path $out "wayward-images-$stamp.tar"
        $expect = [double]$bytes + [double]$count * 1024 + 1
        $p = Start-Process -FilePath $tarExe -ArgumentList @('-c', '-f', "`"$imgTar`"", '-C', "`"$root`"", 'images') -NoNewWindow -PassThru
        $null = $p.Handle   # keep the process handle: without it ExitCode reads as empty once tar has finished
        while (-not $p.HasExited) {
          Start-Sleep -Milliseconds 700
          $now = if (Test-Path -LiteralPath $imgTar) { (Get-Item -LiteralPath $imgTar).Length } else { 0 }
          Write-Progress -Activity $txt.progress -Status ('{0} / {1}' -f (Size $now), (Size $bytes)) -PercentComplete ([math]::Min(99, [int]($now * 100 / $expect)))
        }
        Write-Progress -Activity $txt.progress -Completed
        $p.WaitForExit()
        if ($p.ExitCode -ne 0) { throw "tar ($($p.ExitCode))" }
        Say 'imgDone' @((Split-Path -Leaf $imgTar), (Size (Get-Item -LiteralPath $imgTar).Length))
        Get-ChildItem -LiteralPath $out -Filter 'wayward-images-*.tar' -File | Where-Object { $_.FullName -ne $imgTar } | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force; Say 'removed' @($_.Name) }
      }
    }
  }

  Write-Host ''
  Say 'done' @($out)
  Say 'next1'; Say 'next2'; Say 'next3'
  if (-not $env:WML_NOPAUSE) { Start-Process explorer.exe -ArgumentList "`"$out`"" }
} catch {
  Say 'failed' @($_.Exception.Message)
}
