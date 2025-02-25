#!/bin/bash

# Vérifie si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "Node.js n'est pas installé. Installation en cours..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Vérifie si npm est installé
if ! command -v npm &> /dev/null; then
    echo "npm n'est pas installé. Vérifie ton installation de Node.js."
    exit 1
fi

# Vérifie si Vite est installé
if ! npm list -g vite --depth=0 | grep vite &> /dev/null; then
    echo "Vite n'est pas installé. Installation en cours..."
    npm install -g vite
else
    echo "Vite est déjà installé."
fi

# Lancer Vite avec --open
echo "Démarrage du serveur Vite..."
vite --open
