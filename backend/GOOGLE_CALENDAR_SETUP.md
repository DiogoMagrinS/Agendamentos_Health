# Integração com Google Calendar

## Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env`:

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback
ENCRYPTION_KEY=sua_chave_de_32_caracteres_aqui
FRONTEND_URL=http://localhost:5173
```

**Importante:**
- `ENCRYPTION_KEY` deve ter exatamente 32 caracteres (256 bits para AES-256)
- `GOOGLE_REDIRECT_URI` deve estar configurado no Google Cloud Console
- `FRONTEND_URL` é usado para redirecionar após autenticação

### 2. Aplicar Migration no Banco de Dados

Execute o script SQL no seu banco de dados PostgreSQL:

```bash
psql -d agenda_saude -U postgres -f prisma/migrations/add_google_calendar_fields.sql
```

Ou execute manualmente no PGAdmin:

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

### 3. Regenerar Prisma Client

```bash
cd backend
npx prisma generate
```

## Endpoints da API

### 1. Obter URL de Autenticação
```
GET /api/google-calendar/auth
Headers: Authorization: Bearer <token>
```

Retorna a URL para autenticação OAuth2 do Google Calendar.

### 2. Callback de Autenticação
```
GET /api/google-calendar/callback?code=<code>&state=<profissionalId>
```

Endpoint chamado pelo Google após autorização. Redireciona para o frontend.

### 3. Verificar Conexão
```
GET /api/google-calendar/check
Headers: Authorization: Bearer <token>
```

Verifica se o profissional está conectado ao Google Calendar.

### 4. Desconectar
```
POST /api/google-calendar/disconnect
Headers: Authorization: Bearer <token>
```

Remove as credenciais do Google Calendar do profissional.

## Funcionamento

### Sincronização Automática

Quando um agendamento é:
- **Criado**: Um evento é automaticamente criado no Google Calendar do profissional
- **Atualizado**: O evento correspondente é atualizado no Google Calendar
- **Deletado**: O evento é removido do Google Calendar

**Nota:** A sincronização é não-bloqueante. Se falhar, não interrompe a operação do agendamento.

### Segurança

- Tokens são criptografados antes de serem armazenados no banco de dados
- A criptografia usa AES-256-CBC
- Se `ENCRYPTION_KEY` não estiver configurada, os tokens são armazenados em texto puro (não recomendado para produção)

## Como Usar no Frontend

1. **Conectar Google Calendar:**
   ```javascript
   const response = await api.get('/api/google-calendar/auth');
   window.location.href = response.data.authUrl;
   ```

2. **Verificar Conexão:**
   ```javascript
   const response = await api.get('/api/google-calendar/check');
   const isConnected = response.data.conectado;
   ```

3. **Desconectar:**
   ```javascript
   await api.post('/api/google-calendar/disconnect');
   ```

## Observações

- A integração funciona apenas para profissionais
- O profissional deve estar autenticado para usar os endpoints
- Os eventos são criados no calendário "primary" do Google
- A duração padrão dos eventos é de 1 hora
- Lembretes são configurados: email 24h antes, popup 10min antes

