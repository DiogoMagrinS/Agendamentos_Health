# 📅 Como Usar o Google Calendar - Guia Rápido

## ⚡ Passo a Passo (5 minutos)

### 1️⃣ Aplicar Migration no Banco de Dados

**No PGAdmin:**
1. Abra o PGAdmin
2. Conecte-se ao banco `agenda_saude`
3. Clique com botão direito no banco → **Query Tool**
4. Cole e execute este SQL:

```sql
ALTER TABLE "Profissional" 
ADD COLUMN IF NOT EXISTS "googleCalendarId" TEXT,
ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT,
ADD COLUMN IF NOT EXISTS "googleTokenExpiry" TIMESTAMP(3);

ALTER TABLE "Agendamento" 
ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
```

5. Clique em **Execute** (F5)

### 2️⃣ Regenerar Prisma Client

**No terminal (pasta `backend`):**
```bash
npx prisma generate
```

### 3️⃣ Configurar Credenciais do Google

**No Google Cloud Console:**
1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. **⚠️ IMPORTANTE: Ative a API do Google Calendar PRIMEIRO:**
   - Vá em **APIs & Services** → **Library** (ou use o link direto: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
   - Procure por **"Google Calendar API"**
   - Clique no resultado
   - Clique no botão **"ENABLE"** (Habilitar)
   - **AGUARDE alguns minutos** para a API ser ativada completamente
4. **Configure a tela de consentimento OAuth:**
   - Vá em **APIs & Services** → **OAuth consent screen**
   - Escolha **External** (para desenvolvimento)
   - Preencha: App name, User support email, Developer contact
   - Em **Scopes**, adicione:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Em **Test users**, adicione seu email (diogo2004009@gmail.com)
5. **Criar OAuth Client ID:**
   - Vá em **APIs & Services** → **Credentials**
   - Clique em **Create Credentials** → **OAuth client ID**
   - Escolha **Web application**
   - Configure:
     - **Name**: `Agenda Saúde Calendar`
     - **Authorized redirect URIs**: 
       - `http://localhost:3000/api/google-calendar/callback`
       - `http://localhost:3001/api/google-calendar/callback` (adicione ambas!)
   - Clique em **Create**
6. **Copie as credenciais:**
   - Você verá **Client ID** e **Client Secret**
   - **COPIE ESSES VALORES!** (você não verá o secret novamente)

### 4️⃣ Adicionar Variáveis de Ambiente

**No arquivo `.env` (pasta `backend`):**
```env
GOOGLE_CLIENT_ID=seu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback
ENCRYPTION_KEY=chave_exatamente_32_caracteres_aqui
FRONTEND_URL=http://localhost:5173
```

**⚠️ IMPORTANTE:**
- `ENCRYPTION_KEY` deve ter **exatamente 32 caracteres**
- Gere uma chave segura: `openssl rand -base64 32 | head -c 32`

### 5️⃣ Reiniciar o Servidor

```bash
# Pare o servidor (Ctrl+C) e inicie novamente
npm run dev
```

## ✅ Como Funciona

### Para Profissionais:

1. **Conectar Google Calendar:**
   - Faça login como profissional
   - Acesse o dashboard do profissional (`/dashboard/profissional`)
   - **O botão "Conectar Google Calendar" está no canto superior direito do header do dashboard**
   - Clique no botão azul "Conectar Google Calendar"
   - Autorize o acesso na página do Google
   - Você será redirecionado de volta automaticamente

2. **Sincronização Automática:**
   - ✅ Quando criar um agendamento → Evento criado no Google Calendar
   - ✅ Quando atualizar um agendamento → Evento atualizado no Google Calendar
   - ✅ Quando deletar um agendamento → Evento removido do Google Calendar

3. **Verificar Conexão:**
   - O sistema mostra se você está conectado ao Google Calendar

4. **Desconectar:**
   - Clique em "Desconectar Google Calendar" quando necessário

## 🔧 Endpoints da API

### Conectar
```
GET /api/google-calendar/auth
Headers: Authorization: Bearer <token>
```

### Verificar Conexão
```
GET /api/google-calendar/check
Headers: Authorization: Bearer <token>
```

### Desconectar
```
POST /api/google-calendar/disconnect
Headers: Authorization: Bearer <token>
```

## 🐛 Resolução de Problemas

### Erro: "Campos não existem no banco"
**Solução:** Execute o SQL do Passo 1 novamente

### Erro: "OAuth client was not found" ou "invalid_client"
**Solução:** 
1. Verifique se você criou o OAuth Client ID no Google Cloud Console
2. Verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão corretos no `.env`
3. Verifique se copiou o Client ID e Secret corretamente (sem espaços extras)
4. Veja o guia completo: `RESOLVER_ERRO_OAUTH.md`

### Erro: "Invalid credentials"
**Solução:** Verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão corretos no `.env`

### Erro: "Redirect URI mismatch"
**Solução:** Verifique se o `GOOGLE_REDIRECT_URI` no `.env` está igual ao configurado no Google Cloud Console

### Erro: "ENCRYPTION_KEY inválida"
**Solução:** A chave deve ter exatamente 32 caracteres. Gere uma nova:
```bash
openssl rand -base64 32 | head -c 32
```

### Eventos não aparecem no Google Calendar
**Solução:** 
1. Verifique se o profissional está conectado (`/api/google-calendar/check`)
2. Verifique os logs do servidor para erros
3. Confirme que as variáveis de ambiente estão configuradas

## 📝 Checklist Rápido

- [ ] SQL aplicado no banco de dados
- [ ] `npx prisma generate` executado
- [ ] Credenciais criadas no Google Cloud Console
- [ ] Variáveis de ambiente configuradas no `.env`
- [ ] `ENCRYPTION_KEY` com 32 caracteres
- [ ] Servidor reiniciado
- [ ] Profissional conectado ao Google Calendar

## 🎯 Pronto!

Agora os agendamentos serão sincronizados automaticamente com o Google Calendar! 🚀

