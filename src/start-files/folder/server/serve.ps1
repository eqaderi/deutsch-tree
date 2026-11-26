# The Windows start file's web server. Written for Windows PowerShell 5.1, which ships
# with Windows 10 and 11. ASCII only: Windows PowerShell reads a file without a byte
# order mark in the old Windows code page.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1 -Root <app folder> [-Port <first port>]
#
# When it starts, it rewrites private\packs.json from the subfolders that hold a
# pack.json (the rules of src/pack-builder/pack-list.ts). Then it serves the app folder
# to this computer and to every device on the home network, on a plain TCP socket,
# which needs no administrator. GET and HEAD, single byte ranges (iPhones need them to
# play and seek recordings).
param([Parameter(Mandatory = $true)][string]$Root, [int]$Port = 8000)
$ErrorActionPreference = 'Stop'

$MimeTypes = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.mjs' = 'text/javascript; charset=utf-8'; '.json' = 'application/json; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.svg' = 'image/svg+xml'; '.txt' = 'text/plain; charset=utf-8'
  '.map' = 'application/json; charset=utf-8'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'; '.gif' = 'image/gif'; '.ico' = 'image/x-icon'; '.pdf' = 'application/pdf'
  '.wasm' = 'application/wasm'; '.bcmap' = 'application/octet-stream'; '.pfb' = 'application/octet-stream'
  '.ttf' = 'font/ttf'; '.otf' = 'font/otf'; '.woff' = 'font/woff'; '.woff2' = 'font/woff2'
  '.mp3' = 'audio/mpeg'; '.m4a' = 'audio/mp4'; '.ogg' = 'audio/ogg'; '.opus' = 'audio/ogg'; '.wav' = 'audio/wav'
}

function Get-ContentType([string]$Path) {
  $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  if ($MimeTypes.ContainsKey($ext)) { return $MimeTypes[$ext] }
  return 'application/octet-stream'
}

# Writes text as UTF-8 without a byte order mark.
function Write-TextFile([string]$Path, [string]$Text) {
  try { [System.IO.File]::WriteAllText($Path, $Text) } catch { Write-Host "Could not write ${Path}: $($_.Exception.Message)" }
}

# The packs in a folder: every subfolder with a pack id for a name and a pack.json in it, in name order.
function Get-PackIds([string]$Dir) {
  $ids = New-Object System.Collections.Generic.List[string]
  foreach ($sub in [System.IO.Directory]::GetDirectories($Dir)) {
    $name = [System.IO.Path]::GetFileName($sub)
    if ($name -cmatch '^[a-z0-9]+(-[a-z0-9]+)*$' -and [System.IO.File]::Exists([System.IO.Path]::Combine($sub, 'pack.json'))) {
      $ids.Add($name)
    }
  }
  $ids.Sort([System.StringComparer]::Ordinal)
  return , $ids.ToArray()
}

# The address other devices on the home network use for this computer, or $null.
# "Connecting" a UDP socket sends nothing; it only makes the system pick the
# address it would send from.
function Get-LanAddress {
  try {
    $udp = New-Object System.Net.Sockets.UdpClient
    $udp.Connect('192.0.2.1', 9)
    $ip = $udp.Client.LocalEndPoint.Address.ToString()
    $udp.Close()
    if ($ip -ne '0.0.0.0' -and $ip -notlike '127.*' -and $ip -notlike '169.254.*') { return $ip }
  } catch { }
  try {
    foreach ($nic in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
      if ($nic.OperationalStatus -ne 'Up' -or $nic.NetworkInterfaceType -eq 'Loopback') { continue }
      foreach ($a in $nic.GetIPProperties().UnicastAddresses) {
        $s = $a.Address.ToString()
        if ($a.Address.AddressFamily -eq 'InterNetwork' -and $s -notlike '127.*' -and $s -notlike '169.254.*') { return $s }
      }
    }
  } catch { }
  return $null
}

# Maps the request target to a file inside the app folder.
function Resolve-SiteFile([string]$Target) {
  $path = $Target
  $cut = $path.IndexOfAny([char[]]'?#')
  if ($cut -ge 0) { $path = $path.Substring(0, $cut) }
  try { $path = [System.Uri]::UnescapeDataString($path) } catch { return @{ Status = 400 } }
  if (-not $path.StartsWith('/') -or $path.Contains('..') -or $path.Contains('\') -or $path.Contains(':') -or $path.IndexOf([char]0) -ge 0) {
    return @{ Status = 403 }
  }
  $full = $script:SiteRoot
  foreach ($part in $path.Split('/')) {
    if ($part -ne '') { $full = [System.IO.Path]::Combine($full, $part) }
  }
  if ($path.EndsWith('/') -and [System.IO.Directory]::Exists($full)) { $full = [System.IO.Path]::Combine($full, 'index.html') }
  if (-not [System.IO.File]::Exists($full)) { return @{ Status = 404 } }
  return @{ Status = 200; Path = $full }
}

# Parses "Range: bytes=a-b" for a file of the given size.
function Get-ByteRange([string]$Header, [long]$Size) {
  if (-not $Header -or $Size -le 0) { return @{ Partial = $false } }
  $m = [regex]::Match($Header, '^bytes=(\d*)-(\d*)$')
  if (-not $m.Success) { return @{ Partial = $false } }
  $a = $m.Groups[1].Value; $b = $m.Groups[2].Value
  [long]$start = 0; [long]$end = $Size - 1
  if ($a -eq '' -and $b -ne '') {
    $start = $Size - [long]$b
    if ($start -lt 0) { $start = 0 }
  } elseif ($a -ne '') {
    $start = [long]$a
    if ($b -ne '' -and [long]$b -lt $Size) { $end = [long]$b }
  } else {
    return @{ Partial = $false }
  }
  if ($start -gt $end) { return @{ Invalid = $true } }
  return @{ Partial = $true; Start = $start; End = $end }
}

function Send-Head($Stream, [string]$Head) {
  $bytes = [System.Text.Encoding]::ASCII.GetBytes($Head)
  $Stream.Write($bytes, 0, $bytes.Length)
}

function Send-Text($Stream, [int]$Code, [string]$Text) {
  $body = "$Code $Text`n"
  Send-Head $Stream "HTTP/1.1 $Code $Text`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n$body"
}

function Copy-FileRange([string]$Path, [long]$Start, [long]$Length, $Output) {
  $fs = [System.IO.File]::Open($Path, 'Open', 'Read', 'ReadWrite')
  try {
    [void]$fs.Seek($Start, 'Begin')
    $buffer = New-Object byte[] 65536
    [long]$left = $Length
    while ($left -gt 0) {
      $n = $fs.Read($buffer, 0, [int][Math]::Min([long]$buffer.Length, $left))
      if ($n -le 0) { break }
      $Output.Write($buffer, 0, $n)
      $left -= $n
    }
  } finally { $fs.Close() }
}

function Invoke-Request($Client) {
  $Client.ReceiveTimeout = 3000
  $Client.SendTimeout = 30000
  $stream = $Client.GetStream()

  # Read the request head, up to the empty line.
  $buffer = New-Object byte[] 16384
  $used = 0
  $head = ''
  while ($used -lt $buffer.Length) {
    $n = $stream.Read($buffer, $used, $buffer.Length - $used)
    if ($n -le 0) { break }
    $used += $n
    $head = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $used)
    if ($head.Contains("`r`n`r`n")) { break }
  }
  if ($used -eq 0) { return }   # a browser opened a spare connection and closed it
  $lines = $head -split "`r`n"
  $m = [regex]::Match($lines[0], '^(GET|HEAD) (\S+) HTTP/1\.[01]$')
  if (-not $m.Success) { Send-Text $stream 400 'Bad Request'; return }
  $method = $m.Groups[1].Value
  $rangeHeader = $null
  foreach ($line in $lines) {
    if ($line -match '^Range:\s*(.*)$') { $rangeHeader = $Matches[1].Trim() }
  }

  $file = Resolve-SiteFile $m.Groups[2].Value
  if ($file.Status -eq 400) { Send-Text $stream 400 'Bad Request'; return }
  if ($file.Status -eq 403) { Send-Text $stream 403 'Forbidden'; return }
  if ($file.Status -ne 200) { Send-Text $stream 404 'Not Found'; return }

  [long]$size = (New-Object System.IO.FileInfo($file.Path)).Length
  $range = Get-ByteRange $rangeHeader $size
  if ($range.Invalid) {
    Send-Head $stream "HTTP/1.1 416 Range Not Satisfiable`r`nContent-Range: bytes */$size`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
    return
  }
  [long]$start = 0; [long]$length = $size; $status = '200 OK'; $extra = ''
  if ($range.Partial) {
    $start = $range.Start; $length = $range.End - $range.Start + 1
    $status = '206 Partial Content'
    $extra = "Content-Range: bytes $($range.Start)-$($range.End)/$size`r`n"
  }
  Send-Head $stream "HTTP/1.1 $status`r`nContent-Type: $(Get-ContentType $file.Path)`r`nContent-Length: $length`r`nAccept-Ranges: bytes`r`nCache-Control: no-cache`r`n${extra}Connection: close`r`n`r`n"
  if ($method -eq 'GET' -and $length -gt 0) { Copy-FileRange $file.Path $start $length $stream }
  $stream.Flush()
}

try {
  # .NET resolves relative paths against the process folder, not PowerShell's, so resolve first.
  $script:SiteRoot = (Resolve-Path -LiteralPath $Root).Path
  if (-not [System.IO.File]::Exists([System.IO.Path]::Combine($script:SiteRoot, 'index.html'))) {
    throw "There is no index.html in $Root."
  }

  $private = [System.IO.Path]::Combine($script:SiteRoot, 'private')
  [void][System.IO.Directory]::CreateDirectory($private)
  $ids = Get-PackIds $private
  $quoted = @($ids | ForEach-Object { '"' + $_ + '"' })
  Write-TextFile ([System.IO.Path]::Combine($private, 'packs.json')) ('{"format":1,"packs":[' + ($quoted -join ',') + "]}`n")

  $listener = $null
  for ($p = $Port; $p -lt ($Port + 10); $p++) {
    try {
      $candidate = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $p)
      $candidate.Start(64)
      $listener = $candidate; $Port = $p
      break
    } catch { }
  }
  if (-not $listener) { throw "No free port between $Port and $($Port + 9). Is the app already running in another window?" }
  $lan = Get-LanAddress
  $phone = $null
  if ($lan) { $phone = "http://${lan}:$Port/" }
  $phoneJson = 'null'
  if ($phone) { $phoneJson = '"' + $phone + '"' }
  Write-TextFile ([System.IO.Path]::Combine($private, 'address.json')) ('{"format":1,"phone":' + $phoneJson + "}`n")

  Write-Host ''
  Write-Host ('=' * 66)
  Write-Host ' deutsch-tree is running.'
  Write-Host ''
  Write-Host " On this computer:  http://localhost:$Port/"
  if ($phone) {
    Write-Host " On a phone or tablet on the same Wi-Fi:  $phone"
  } else {
    Write-Host ' On a phone: this computer is not on a network. Connect it to the Wi-Fi and start again.'
  }
  Write-Host ''
  Write-Host ' If Windows asks whether to allow "Windows PowerShell" on networks,'
  Write-Host ' allow it on private networks, or phones cannot open the app.'
  Write-Host ''
  Write-Host ' Leave this window open while you use the app.'
  Write-Host ' To stop the app: close this window, or press Ctrl+C.'
  Write-Host ('=' * 66)
  Write-Host ''
  if (-not $env:NO_OPEN) {
    try { Start-Process "http://localhost:$Port/" } catch { Write-Host "Open http://localhost:$Port/ in your browser." }
  }

  # One loop, no threads: accept new connections, answer the ones that have sent a
  # request, and drop connections that stay silent (browsers open spare ones).
  $waiting = New-Object System.Collections.ArrayList
  try {
    while ($true) {
      $busy = $false
      while ($listener.Pending()) {
        [void]$waiting.Add(@{ Client = $listener.AcceptTcpClient(); Since = [DateTime]::UtcNow })
        $busy = $true
      }
      foreach ($entry in @($waiting)) {
        $client = $entry.Client
        $ready = $true
        try { $ready = $client.Client.Poll(0, [System.Net.Sockets.SelectMode]::SelectRead) } catch { }
        if ($ready) {
          $waiting.Remove($entry)
          try { Invoke-Request $client } catch { }
          try { $client.Close() } catch { }
          $busy = $true
        } elseif (([DateTime]::UtcNow - $entry.Since).TotalSeconds -gt 15) {
          $waiting.Remove($entry)
          try { $client.Close() } catch { }
        }
      }
      if (-not $busy) { Start-Sleep -Milliseconds 20 }
    }
  } finally {
    $listener.Stop()
  }
} catch {
  Write-Host ''
  Write-Host "The app could not start: $($_.Exception.Message)"
  exit 1
}
