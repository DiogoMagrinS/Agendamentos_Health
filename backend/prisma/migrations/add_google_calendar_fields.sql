-- Migration: Adicionar campos do Google Calendar
-- Execute este script no seu banco de dados PostgreSQL

-- Adiciona campos na tabela Profissional
ALTER TABLE "Profissional" 
ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT,
ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleTokenExpiry" TIMESTAMP(3);

-- Adiciona campo na tabela Agendamento
ALTER TABLE "Agendamento" 
ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;

-- Verifica se as colunas foram criadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('Profissional', 'Agendamento') 
AND column_name LIKE 'google%'
ORDER BY table_name, column_name;

