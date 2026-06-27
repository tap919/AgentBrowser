$env:NEXT_TELEMETRY_DISABLED = "1"
Remove-Item "server.log" -ErrorAction SilentlyContinue
Remove-Item "server_err.log" -ErrorAction SilentlyContinue
npx next dev --port 3000 2>server_err.log | Tee-Object -FilePath "server.log" -Append
