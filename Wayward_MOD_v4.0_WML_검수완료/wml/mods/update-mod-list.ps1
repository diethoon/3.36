# Brings mods.js in line with the mod folders next to it.
# Run by update-mod-list.cmd / 모드목록_자동갱신.cmd, which pass their own path: its file name picks the language
# (Korean letters: Korean messages, an ASCII name: English). Run on its own, it works on the folder it is in.
param([string]$Launcher = '')
$f = if ($Launcher) { $Launcher } else { $PSCommandPath }
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
$lang = if ([IO.Path]::GetFileName($f) -match '^[ -~]+$') { 'en' } else { 'ko' }
$msg = @{
  ko = @{
    title   = '모드 목록(mods.js) 맞추기'
    added   = '새로 넣은 모드 {0}개 (켜진 채로 추가):'
    removed = '폴더가 없어서 목록에서 뺀 모드 {0}개:'
    skipped = '폴더 이름이 규칙에 안 맞아 건너뛴 것 (소문자·숫자·.-_ 만, 폴더 이름 = 모드 id):'
    same    = '바뀐 것 없음. 목록이 폴더와 이미 맞아요.'
    done    = '이전 목록은 mods.js.bak 으로 남겨 뒀어요. 게임을 새로고침하면 적용돼요.'
    count   = '지금 목록: 모드 {0}개'
    bad     = 'mods.js 모양을 알아보지 못했어요 (WML.enable([ ... ]); 가 있어야 해요). 아무것도 바꾸지 않았어요.'
  }
  en = @{
    title   = 'Syncing the mod list (mods.js)'
    added   = 'Added {0} new mod(s), switched on:'
    removed = 'Removed {0} entr(ies) whose folder is gone:'
    skipped = 'Skipped folders with invalid names (lower-case letters, digits, .-_ only; folder name = mod id):'
    same    = 'Nothing to change - the list already matches the folders.'
    done    = 'The previous list was kept as mods.js.bak. Reload the game to apply.'
    count   = 'Mods listed now: {0}'
    bad     = 'Could not read mods.js (it needs WML.enable([ ... ]);). Nothing was changed.'
  }
}[$lang]

$dir = Split-Path -Parent $f
$listFile = Join-Path $dir 'mods.js'
$utf8 = New-Object Text.UTF8Encoding($false)

if (-not (Test-Path $listFile)) {
  [IO.File]::WriteAllText($listFile, "// mod list and default load order (top to bottom). `"id:off`" = listed but off by default.`nWML.enable([`n]);`n", $utf8)
}
$text = [IO.File]::ReadAllText($listFile, [Text.Encoding]::UTF8)
$nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
$lines = New-Object System.Collections.Generic.List[string]
$text.TrimEnd("`r", "`n") -split "`r?`n" | ForEach-Object { $lines.Add($_) }
$entry = '^\s*"([^":]+)(:off)?"\s*,?'

# folders that hold a mod (the folder name is the mod id)
$folders = @{}
$skipped = @()
Get-ChildItem -Path $dir -Directory | ForEach-Object {
  $modJs = Join-Path $_.FullName 'mod.js'
  if (-not (Test-Path $modJs)) { return }
  if ($_.Name -cnotmatch '^[a-z0-9][a-z0-9._-]*$') { $skipped += $_.Name; return }
  $src = [IO.File]::ReadAllText($modJs, [Text.Encoding]::UTF8)
  $name = ''
  $at = $src.IndexOf('WML.define')
  if ($at -ge 0) { $m = [regex]::Match($src.Substring($at), "name:\s*(['`"])(.*?)\1"); if ($m.Success) { $name = $m.Groups[2].Value } }
  $folders[$_.Name] = $name
}

# drop entries whose folder is gone
$listed = @()
$removed = @()
for ($k = $lines.Count - 1; $k -ge 0; $k--) {
  $m = [regex]::Match($lines[$k], $entry)
  if (-not $m.Success) { continue }
  $id = $m.Groups[1].Value
  if ($folders.ContainsKey($id)) { $listed += $id } else { $removed += $id; $lines.RemoveAt($k) }
}

# add new folders before the translation checker / example at the end, or before "]);"
$new = @($folders.Keys | Where-Object { $listed -notcontains $_ } | Sort-Object)
if ($new.Count) {
  $pos = -1
  for ($k = 0; $k -lt $lines.Count; $k++) {
    $m = [regex]::Match($lines[$k], $entry)
    if ($m.Success -and @('i18n-check', 'hello-wml') -contains $m.Groups[1].Value) { $pos = $k; break }
  }
  if ($pos -lt 0) { for ($k = $lines.Count - 1; $k -ge 0; $k--) { if ($lines[$k] -match '^\s*\]\s*\)\s*;?\s*$') { $pos = $k; break } } }
  if ($pos -lt 0) { Write-Host $msg.bad; return }
  foreach ($id in $new) {
    $item = "  `"$id`","
    $line = if ($folders[$id]) { ($item + ' ').PadRight(22) + '// ' + $folders[$id] } else { $item }
    $lines.Insert($pos, $line); $pos++
  }
}

if ($new.Count -or $removed.Count) {
  Copy-Item $listFile "$listFile.bak" -Force
  [IO.File]::WriteAllText($listFile, ($lines -join $nl) + $nl, $utf8)
}

Write-Host ''
Write-Host $msg.title
Write-Host '------------------------------------------'
if ($new.Count) { Write-Host ($msg.added -f $new.Count); $new | ForEach-Object { Write-Host ('  + {0}  {1}' -f $_, $folders[$_]) } }
if ($removed.Count) { Write-Host ($msg.removed -f $removed.Count); $removed | ForEach-Object { Write-Host ('  - {0}' -f $_) } }
if ($skipped.Count) { Write-Host $msg.skipped; $skipped | ForEach-Object { Write-Host ('  ? {0}' -f $_) } }
if (-not ($new.Count -or $removed.Count)) { Write-Host $msg.same } else { Write-Host ''; Write-Host $msg.done }
Write-Host ($msg.count -f $folders.Count)
