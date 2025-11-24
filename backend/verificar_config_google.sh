#!/bin/bash
# Script para verificar se as variáveis do Google Calendar estão configuradas

echo "🔍 Verificando configuração do Google Calendar..."
echo ""

if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Crie o arquivo .env na pasta backend/"
    exit 1
fi

# Carrega as variáveis do .env
source .env 2>/dev/null || true

# Verifica cada variável
erro=0

if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo "❌ GOOGLE_CLIENT_ID não configurado"
    erro=1
else
    echo "✅ GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:0:20}..."
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "❌ GOOGLE_CLIENT_SECRET não configurado"
    erro=1
else
    echo "✅ GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:0:10}..."
fi

if [ -z "$GOOGLE_REDIRECT_URI" ]; then
    echo "❌ GOOGLE_REDIRECT_URI não configurado"
    erro=1
else
    echo "✅ GOOGLE_REDIRECT_URI: $GOOGLE_REDIRECT_URI"
fi

if [ -z "$ENCRYPTION_KEY" ]; then
    echo "❌ ENCRYPTION_KEY não configurado"
    erro=1
elif [ ${#ENCRYPTION_KEY} -ne 32 ]; then
    echo "❌ ENCRYPTION_KEY deve ter exatamente 32 caracteres (tem ${#ENCRYPTION_KEY})"
    erro=1
else
    echo "✅ ENCRYPTION_KEY: ${#ENCRYPTION_KEY} caracteres"
fi

if [ -z "$FRONTEND_URL" ]; then
    echo "⚠️  FRONTEND_URL não configurado (usando padrão: http://localhost:5173)"
else
    echo "✅ FRONTEND_URL: $FRONTEND_URL"
fi

echo ""
if [ $erro -eq 0 ]; then
    echo "✅ Todas as variáveis estão configuradas!"
    echo ""
    echo "📝 Próximos passos:"
    echo "   1. Verifique se o OAuth Client ID foi criado no Google Cloud Console"
    echo "   2. Verifique se o Redirect URI está correto no Google Cloud Console"
    echo "   3. Reinicie o servidor: npm run dev"
else
    echo "❌ Algumas variáveis estão faltando ou incorretas!"
    echo ""
    echo "📖 Veja o guia: RESOLVER_ERRO_OAUTH.md"
fi

