# ⚠️ IMPORTANTE: Aplicar Migration do Google Calendar

## O Problema

Os campos do Google Calendar foram adicionados ao schema Prisma, mas **ainda não existem no banco de dados**. Por isso você está recebendo erros como:

```
The column `Profissional.googleCalendarId` does not exist in the current database.
```

## Solução: Aplicar o SQL no Banco de Dados

### Opção 1: Via PGAdmin (Recomendado)

1. Abra o PGAdmin
2. Conecte-se ao banco `agenda_saude`
3. Abra o Query Tool (ferramenta de consulta)
4. Cole e execute o seguinte SQL:

```sql
-- Adiciona campos na tabela Profissional
ALTER TABLE "Profissional" 
ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT,
ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleTokenExpiry" TIMESTAMP(3);

-- Adiciona campo na tabela Agendamento
ALTER TABLE "Agendamento" 
ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
```

5. Clique em "Execute" (F5)

### Opção 2: Via Terminal (psql)

```bash
cd backend
psql -d agenda_saude -U seu_usuario -f prisma/migrations/add_google_calendar_fields.sql
```

### Opção 3: Via Script Automático

```bash
cd backend
./aplicar_migration.sh
```

## Depois de Aplicar

Após executar o SQL, regenere o Prisma Client:

```bash
cd backend
npx prisma generate
```

## Verificar se Funcionou

Teste se o Prisma Client está funcionando:

```bash
cd backend
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.profissional.findMany({ take: 1 }).then(() => { console.log('✅ OK'); p.\$disconnect(); }).catch(e => { console.error('❌ Erro:', e.message); p.\$disconnect(); });"
```

Se aparecer "✅ OK", está tudo funcionando!

## Por que não usar `npx prisma migrate dev`?

O Prisma detectou um "drift" (diferenças) entre o schema e o banco, provavelmente porque há migrations aplicadas no banco que não estão no diretório local. Por segurança, é melhor aplicar o SQL manualmente para não perder dados.

