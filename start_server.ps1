# Vérifie si Node.js est installé
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "Node.js n'est pas installé. Installation en cours..."
    Invoke-WebRequest "https://nodejs.org/dist/latest/node-v20.10.0-x64.msi" -OutFile "node-latest.msi"
    Start-Process "node-latest.msi" -Wait
    Remove-Item "node-latest.msi"
    Write-Host "Node.js installé. Redémarre ton terminal si nécessaire."
} else {
    Write-Host "Node.js est déjà installé."
}

# Vérifie si npm est installé
$npmInstalled = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmInstalled) {
    Write-Host "npm n'est pas installé. Essaye de relancer ton terminal après l'installation de Node.js."
    exit 1
}

# Vérifie si Vite est installé
$viteInstalled = npm list -g vite --depth=0 | Select-String "vite"
if (-not $viteInstalled) {
    Write-Host "Vite n'est pas installé. Installation en cours..."
    npm install -g vite
} else {
    Write-Host "Vite est déjà installé."
}

# Lancer Vite avec --open
Write-Host "Démarrage du serveur Vite..."
vite --open
