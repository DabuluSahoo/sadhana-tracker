# Start Backend
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "server" -NoNewWindow
Write-Host "Backend started on port 5000"

# Start Frontend
Set-Location "frontend"
npm run dev
