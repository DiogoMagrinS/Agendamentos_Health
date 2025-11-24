# ⚠️ ERRO: Google Calendar API não está habilitada

## 🔴 Erro que você está vendo:
```
Google Calendar API has not been used in project 529369724792 before or it is disabled.
```

## ✅ Solução Rápida (2 minutos)

### 1. Acesse o Google Cloud Console
Vá para: https://console.cloud.google.com/

### 2. Selecione o Projeto
- No topo, clique no seletor de projetos
- Selecione o projeto que você usou para criar as credenciais OAuth

### 3. Habilite a Google Calendar API

**Opção A - Link Direto:**
Clique aqui: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com/overview?project=529369724792

**Opção B - Manual:**
1. No menu lateral, vá em **APIs & Services** → **Library**
2. Na busca, digite: **"Google Calendar API"**
3. Clique no resultado **"Google Calendar API"**
4. Clique no botão **"ENABLE"** (Habilitar)

### 4. Aguarde a Ativação
- Após clicar em "ENABLE", aguarde **2-5 minutos**
- A API precisa ser propagada nos servidores do Google

### 5. Verifique se Está Habilitada
- Você deve ver um botão **"MANAGE"** ao invés de **"ENABLE"**
- Isso significa que a API está habilitada

### 6. Teste Novamente
- Crie um novo agendamento no sistema
- O evento deve ser criado no Google Calendar

## 📝 Nota Importante

A Google Calendar API **DEVE** estar habilitada **ANTES** de criar as credenciais OAuth, mas se você já criou, basta habilitar agora e aguardar alguns minutos.

## ✅ Pronto!

Depois de habilitar e aguardar alguns minutos, os agendamentos serão salvos automaticamente no Google Calendar!

