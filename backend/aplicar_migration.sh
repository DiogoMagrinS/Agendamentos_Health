#!/bin/bash
# Script para aplicar a migration do Google Calendar

echo "Aplicando migration do Google Calendar..."

# Verifica se o psql está disponível
if ! command -v psql &> /dev/null; then
    echo "❌ psql não encontrado. Execute o SQL manualmente no PGAdmin:"
    echo ""
    cat prisma/migrations/add_google_calendar_fields.sql
    exit 1
fi

# Tenta aplicar via psql
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL não configurada. Usando valores padrão..."
    echo "Execute manualmente no PGAdmin ou configure DATABASE_URL"
    echo ""
    cat prisma/migrations/add_google_calendar_fields.sql
    exit 1
fi

# Extrai informações da DATABASE_URL
# Formato: postgresql://user:password@host:port/database
psql "$DATABASE_URL" -f prisma/migrations/add_google_calendar_fields.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration aplicada com sucesso!"
    echo "Agora execute: npx prisma generate"
else
    echo "❌ Erro ao aplicar migration. Execute manualmente no PGAdmin:"
    echo ""
    cat prisma/migrations/add_google_calendar_fields.sql
fi

