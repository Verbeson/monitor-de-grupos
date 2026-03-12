#!/bin/bash
# Script para gerar o ZIP da extensao para upload na Chrome Web Store
# Funciona no Windows (Git Bash) usando PowerShell como fallback

cd "$(dirname "$0")/extension"

OUTPUT="../public/MonitorDeGrupos-Extension.zip"
rm -f "$OUTPUT"

FILES="manifest.json background.js content.js popup.html popup.js alert.html alert.js icons"

if command -v zip &> /dev/null; then
  zip -r "$OUTPUT" $FILES
else
  # Windows fallback via PowerShell
  powershell -Command "Compress-Archive -Path $FILES -DestinationPath '$OUTPUT' -Force"
fi

echo "ZIP criado: public/MonitorDeGrupos-Extension.zip"
