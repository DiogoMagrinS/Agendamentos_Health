# 🔧 Resolver Erro OAuth: "OAuth client was not found"

## ❌ Erro que você está vendo:
```
The OAuth client was not found.
Erro 401: invalid_client
```

## ✅ Solução Passo a Passo

### 1️⃣ Criar Credenciais no Google Cloud Console

1. **Acesse o Google Cloud Console:**
   - Vá para: https://console.cloud.google.com/

2. **Crie ou selecione um projeto:**
   - Clique no seletor de projetos no topo
   - Clique em "New Project" ou selecione um existente
   - Dê um nome (ex: "Agenda Saúde")

3. **Ative a API do Google Calendar:**
   - No menu lateral, vá em **APIs & Services** → **Library**
   - Procure por "Google Calendar API"
   - Clique e depois em **Enable**

4. **Configure a tela de consentimento OAuth:**
   - Vá em **APIs & Services** → **OAuth consent screen**
   - Escolha **External** (para desenvolvimento)
   - Preencha:
     - **App name**: Agenda Saúde
     - **User support email**: seu email
     - **Developer contact**: seu email
   - Clique em **Save and Continue**
   - Em **Scopes**, clique em **Add or Remove Scopes**
   - Adicione:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Clique em **Save and Continue**
   - Em **Test users**, adicione seu email (diogo2004009@gmail.com)
   - Clique em **Save and Continue**

5. **Criar OAuth Client ID:**
   - Vá em **APIs & Services** → **Credentials**
   - Clique em **Create Credentials** → **OAuth client ID**
   - Se pedir, escolha **Web application**
   - Configure:
     - **Name**: `Agenda Saúde Calendar`
     - **Authorized JavaScript origins**: 
       - `http://localhost:3000`
       - `http://localhost:3001`
     - **Authorized redirect URIs**:
       - `http://localhost:3000/api/google-calendar/callback`
       - `http://localhost:3001/api/google-calendar/callback`
   - Clique em **Create**

6. **Copie as credenciais:**
   - Você verá uma janela com:
     - **Your Client ID** (algo como: `123456789-abc.apps.googleusercontent.com`)
     - **Your Client Secret** (uma string longa)
   - **COPIE ESSES VALORES!** (você não verá o secret novamente)

### 2️⃣ Configurar no arquivo `.env`

Abra o arquivo `backend/.env` e adicione/atualize:

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback
ENCRYPTION_KEY=chave_exatamente_32_caracteres_aqui
FRONTEND_URL=http://localhost:5173
```

**⚠️ IMPORTANTE:**
- Substitua `seu_client_id_aqui` pelo Client ID que você copiou
- Substitua `seu_client_secret_aqui` pelo Client Secret que você copiou
- O `ENCRYPTION_KEY` deve ter **exatamente 32 caracteres**
  - Para gerar: `openssl rand -base64 32 | head -c 32`

### 3️⃣ Verificar a Porta do Backend

O `GOOGLE_REDIRECT_URI` deve corresponder à porta que seu backend está usando:

- Se o backend está na porta **3000**: `http://localhost:3000/api/google-calendar/callback`
- Se o backend está na porta **3001**: `http://localhost:3001/api/google-calendar/callback`

**Dica:** Adicione ambas as portas no Google Cloud Console para evitar problemas.

### 4️⃣ Reiniciar o Servidor

```bash
# Pare o servidor (Ctrl+C) e inicie novamente
cd backend
npm run dev
```

### 5️⃣ Testar Novamente

1. Acesse o dashboard do profissional
2. Clique em "Conectar Google Calendar"
3. Deve funcionar agora! ✅

## 🐛 Problemas Comuns

### Erro: "Redirect URI mismatch"
**Solução:** 
- Verifique se o `GOOGLE_REDIRECT_URI` no `.env` está **exatamente igual** ao configurado no Google Cloud Console
- Adicione todas as portas possíveis (3000, 3001, 3002, etc.) no Google Cloud Console

### Erro: "Access blocked: This app's request is invalid"
**Solução:**
- Verifique se você adicionou seu email como "Test user" na tela de consentimento OAuth
- Verifique se a API do Google Calendar está habilitada

### Erro: "ENCRYPTION_KEY inválida"
**Solução:**
- A chave deve ter exatamente 32 caracteres
- Gere uma nova: `openssl rand -base64 32 | head -c 32`

## 📝 Checklist Rápido

- [ ] Projeto criado no Google Cloud Console
- [ ] Google Calendar API habilitada
- [ ] Tela de consentimento OAuth configurada
- [ ] Email adicionado como "Test user"
- [ ] OAuth Client ID criado
- [ ] Redirect URIs configurados (porta 3000 e 3001)
- [ ] Credenciais copiadas para o `.env`
- [ ] `ENCRYPTION_KEY` com 32 caracteres
- [ ] Servidor reiniciado

## 🎯 Pronto!

Depois de seguir esses passos, o erro deve desaparecer e você conseguirá conectar o Google Calendar! 🚀

