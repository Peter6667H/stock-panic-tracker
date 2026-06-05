# Stock Panic Dashboard - autostart:
# launch local server + Cloudflare tunnel, then write the public link to a Desktop file.
$ErrorActionPreference = 'SilentlyContinue'
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$proj    = "C:\Users\Lenovo\stock-panic-tracker"
$cf      = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$urlFile = [Environment]::GetFolderPath('Desktop') + "\stock-link.txt"

# 1) start node server if not already up
$running = $false
try { $r = Invoke-WebRequest "http://localhost:3000/" -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { $running = $true } } catch {}
if (-not $running) {
  Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $proj -WindowStyle Hidden
  Start-Sleep -Seconds 6
}

# 2) start Cloudflare quick tunnel
$log = "$env:TEMP\cf_tunnel_err.log"
Remove-Item $log, "$env:TEMP\cf_tunnel_out.log" -ErrorAction SilentlyContinue
Start-Process -FilePath $cf -ArgumentList "tunnel --url http://localhost:3000 --no-autoupdate" -RedirectStandardError $log -RedirectStandardOutput "$env:TEMP\cf_tunnel_out.log" -WindowStyle Hidden

# 3) wait for the tunnel URL to appear
$url = $null
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Seconds 2
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches
    if ($m) { $url = $m.Matches[0].Value; break }
  }
}

# 4) write the link to a Desktop file
if ($url) {
  $now  = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $text = "Stock Panic Dashboard - Public Link`r`n" +
          "======================================`r`n" +
          "$url`r`n`r`n" +
          "(Copy the link above and send it via WeChat to parents.)`r`n" +
          "Note: this link changes after every PC reboot - reopen this file for the latest one.`r`n" +
          "Updated: $now`r`n"
  Set-Content -Path $urlFile -Value $text -Encoding UTF8
}
