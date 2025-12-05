# 📋 Documentação Completa do Sistema de Agendamento para Clínicas

## 🎯 Visão Geral do Projeto

Este é um **sistema completo de agendamento para clínicas médicas** desenvolvido com arquitetura moderna, separando frontend e backend. O sistema permite que pacientes agendem consultas, profissionais gerenciem suas agendas, e recepcionistas administrem todo o sistema.

---

## 🏗️ Arquitetura do Sistema

### **Backend (Node.js + TypeScript + Express)**
- **Framework**: Express.js
- **ORM**: Prisma (gerenciamento de banco de dados)
- **Banco de Dados**: PostgreSQL
- **Autenticação**: JWT (JSON Web Tokens)
- **Segurança**: bcryptjs para hash de senhas

### **Frontend (React + TypeScript + Vite)**
- **Framework**: React 19
- **Build Tool**: Vite
- **Estilização**: Tailwind CSS
- **Roteamento**: React Router DOM
- **HTTP Client**: Axios
- **Notificações**: React Toastify

---

## 📊 Modelo de Dados (Prisma Schema)

### **1. Usuario**
Representa todos os usuários do sistema (pacientes, profissionais, recepcionistas).

```prisma
model Usuario {
  id               Int           @id @default(autoincrement())
  nome             String
  email            String        @unique
  senha            String        // Hash bcrypt
  tipo             TipoUsuario   // PACIENTE | PROFISSIONAL | RECEPCIONISTA
  criadoEm         DateTime      @default(now())
  telefone         String?
  fotoPerfil       String?       // URL da foto de perfil
  agendamentos     Agendamento[] // Relação com agendamentos como paciente
  avaliacoesFeitas Avaliacao[]   // Avaliações que o usuário fez
  notificacoes     Notificacao[] // Notificações recebidas
  profissional     Profissional? // Relação opcional (se for profissional)
}
```

**Características**:
- Um usuário pode ser PACIENTE, PROFISSIONAL ou RECEPCIONISTA
- Se for PROFISSIONAL, tem uma relação com a tabela `Profissional`
- Armazena foto de perfil (URL)

---

### **2. Profissional**
Dados específicos dos profissionais de saúde.

```prisma
model Profissional {
  id                Int           @id @default(autoincrement())
  usuarioId         Int           @unique
  especialidadeId   Int
  diasAtendimento   DiaSemana[]   // Array: [SEGUNDA, TERCA, ...]
  horaInicio        String        // Ex: "08:00"
  horaFim           String        // Ex: "18:00"
  biografia         String?
  formacao          String?
  fotoPerfil        String?
  googleCalendarId  String?       // ID do calendário Google
  googleAccessToken String?       // Token criptografado
  googleRefreshToken String?      // Refresh token criptografado
  googleTokenExpiry DateTime?     // Expiração do token
  agendamentos      Agendamento[]
  avaliacoes        Avaliacao[]
  especialidade     Especialidade
  usuario           Usuario
}
```

**Características**:
- Define dias e horários de atendimento
- Integração com Google Calendar (tokens criptografados)
- Relacionado a uma especialidade

---

### **3. Agendamento**
Representa uma consulta agendada.

```prisma
model Agendamento {
  id              Int               @id @default(autoincrement())
  pacienteId      Int
  profissionalId  Int
  data            DateTime          // Data e hora da consulta
  status          StatusAgendamento // AGENDADO | CONFIRMADO | CANCELADO | FINALIZADO
  criadoEm        DateTime          @default(now())
  observacoes     String?
  googleEventId   String?           // ID do evento no Google Calendar
  paciente        Usuario
  profissional    Profissional
  avaliacoes      Avaliacao?        // Uma avaliação por agendamento
  historicoStatus HistoricoStatus[] // Histórico de mudanças de status
  notificacoes    Notificacao[]
}
```

**Fluxo de Status**:
1. **AGENDADO**: Status inicial quando o paciente cria o agendamento
2. **CONFIRMADO**: Profissional ou recepcionista confirma a presença
3. **CANCELADO**: Agendamento cancelado (com regras de tempo)
4. **FINALIZADO**: Consulta realizada

**Regras de Negócio**:
- Não pode cancelar com menos de 2 horas antes da consulta
- Não pode alterar status se já estiver CANCELADO ou FINALIZADO
- Valida conflitos de horário ao criar/editar

---

### **4. Avaliacao**
Avaliações dos pacientes sobre os atendimentos.

```prisma
model Avaliacao {
  id             Int          @id @default(autoincrement())
  agendamentoId  Int          @unique // Um agendamento = uma avaliação
  profissionalId Int
  pacienteId     Int
  nota           Int          // 1 a 5 estrelas
  comentario     String?
  criadoEm       DateTime     @default(now())
  agendamento    Agendamento
  paciente       Usuario
  profissional   Profissional
}
```

**Regras**:
- Só pode avaliar agendamentos FINALIZADOS
- Um agendamento só pode ter uma avaliação
- Apenas o paciente do agendamento pode avaliar

---

### **5. Especialidade**
Especialidades médicas disponíveis.

```prisma
model Especialidade {
  id            Int            @id @default(autoincrement())
  nome          String         @unique // Ex: "Cardiologia", "Pediatria"
  profissionais Profissional[]
}
```

---

### **6. HistoricoStatus**
Registra todas as mudanças de status de um agendamento.

```prisma
model HistoricoStatus {
  id            Int               @id @default(autoincrement())
  agendamentoId Int
  status        StatusAgendamento
  dataHora      DateTime          @default(now())
  agendamento   Agendamento
}
```

**Uso**: Auditoria e rastreabilidade de mudanças.

---

### **7. Notificacao**
Sistema de notificações (WhatsApp).

```prisma
model Notificacao {
  id               Int               @id @default(autoincrement())
  tipo             TipoNotificacao   // LEMBRETE | CANCELAMENTO | EDICAO | etc
  canal            CanalNotificacao  // WHATSAPP
  destinatarioId   Int
  destinatarioTipo TipoUsuario
  conteudo         String
  meta             Json              // Dados adicionais em JSON
  status           StatusNotificacao // CRIADA | ENVIADA | FALHOU
  detalhesErro     String?
  criadoEm         DateTime          @default(now())
  agendamentoId    Int?
  agendamento      Agendamento?
  destinatario     Usuario
}
```

**Tipos de Notificação**:
- `LEMBRETE`: Lembrete de consulta
- `CANCELAMENTO`: Notificação de cancelamento
- `EDICAO`: Mudança de data/horário
- `POS_CONSULTA`: Após a consulta
- `CONFIRMACAO_PRESENCA`: Confirmação de presença

---

## 🔐 Sistema de Autenticação

### **Fluxo de Login**

1. **Frontend** envia email e senha para `/api/auth/login`
2. **Backend** (`authService.ts`):
   - Busca usuário no banco pelo email
   - Compara senha com hash bcrypt
   - Gera JWT token com payload: `{ id, email, tipo }`
   - Retorna token e dados do usuário
3. **Frontend** armazena token no `localStorage`
4. **Todas as requisições** incluem token no header: `Authorization: Bearer <token>`

### **Middleware de Autenticação** (`authMiddleware.ts`)

```typescript
export function autenticarToken(req: Request, res: Response, next: NextFunction) {
  // 1. Extrai token do header Authorization
  // 2. Verifica e decodifica o token JWT
  // 3. Anexa dados do usuário em req.usuario
  // 4. Permite acesso à rota (next())
}
```

**Proteção de Rotas**:
- Todas as rotas (exceto login) usam `autenticarToken`
- O token expira em 2 horas
- Se inválido/expirado, retorna 401/403

---

## 🎨 Funcionalidades por Tipo de Usuário

### **👤 PACIENTE**

#### **Dashboard do Paciente** (`DashboardPaciente.tsx`)

**Funcionalidades**:

1. **Visualizar Perfil**
   - Nome, email, telefone
   - Foto de perfil (pode atualizar via URL)
   - Botão de logout

2. **Agendar Nova Consulta**
   - Seleciona especialidade
   - Seleciona profissional (com avaliações)
   - Escolhe data e horário
   - Validações:
     - Data futura
     - Dia da semana que o profissional atende
     - Horário dentro do período de atendimento
     - Sem conflitos de horário

3. **Visualizar Agendamentos**
   - Lista todos os agendamentos do paciente
   - Badges de status coloridos:
     - 🟡 **AGENDADO**: Amarelo
     - 🟢 **CONFIRMADO**: Verde
     - 🔴 **CANCELADO**: Vermelho
     - ✅ **FINALIZADO**: Azul
   - Informações: data, profissional, especialidade
   - Ações:
     - Editar agendamento
     - Cancelar (se permitido)
     - Avaliar (apenas se FINALIZADO e não avaliado)

4. **Avaliar Atendimento**
   - Modal com 5 estrelas (1-5)
   - Campo de comentário opcional
   - Só aparece para agendamentos FINALIZADOS
   - Desaparece após avaliação

5. **Visualizar Profissionais**
   - Lista profissionais com avaliações médias
   - Mostra especialidade e nota

6. **Legenda de Status**
   - Explicação visual dos badges de status

---

### **👨‍⚕️ PROFISSIONAL**

#### **Dashboard do Profissional** (`DashboardProfissional.tsx`)

**Funcionalidades**:

1. **Visualizar Agenda**
   - Lista agendamentos do profissional
   - Filtro por data
   - Cards com informações do paciente

2. **Gerenciar Status**
   - Confirmar agendamento
   - Finalizar consulta
   - Cancelar (com validações)

3. **Visualizar Pacientes**
   - Modal com dados do paciente
   - Informações de contato

4. **Integração Google Calendar**
   - Conectar conta Google
   - Sincronização automática:
     - Criação de eventos
     - Atualização de eventos
     - Exclusão de eventos
   - Tokens criptografados no banco

5. **Minhas Avaliações**
   - Visualiza todas as avaliações recebidas
   - Mostra nota e comentário
   - Nome do paciente e data da consulta

6. **Estatísticas**
   - Resumo de agendamentos
   - Status dos agendamentos

---

### **👩‍💼 RECEPCIONISTA**

#### **Dashboard do Recepcionista** (`DashboardRecepcionista.tsx`)

**Funcionalidades**:

1. **Visão Geral** (`DashboardOverview`)
   - Estatísticas gerais:
     - Total de agendamentos
     - Agendamentos por status
     - Próximos agendamentos
   - Gráficos e métricas

2. **Gerenciar Usuários** (`UsuariosManager`)
   - Criar novos usuários (pacientes, profissionais, recepcionistas)
   - Editar usuários existentes
   - Adicionar/atualizar foto de perfil
   - Visualizar lista completa

3. **Gerenciar Especialidades** (`EspecialidadesManager`)
   - Criar especialidades
   - Editar especialidades
   - Listar todas

4. **Gerenciar Agendamentos** (`AgendamentosManager`)
   - Visualizar todos os agendamentos
   - Editar agendamentos
   - Alterar status
   - Filtrar e buscar

---

## 🔄 Fluxos Principais

### **1. Fluxo de Criação de Agendamento**

```
Paciente preenche formulário
    ↓
Frontend valida campos
    ↓
POST /api/agendamentos
    ↓
Backend (agendamentoService.ts):
  1. Valida paciente existe e é do tipo PACIENTE
  2. Valida profissional existe
  3. Valida data é futura
  4. Valida dia da semana (profissional atende?)
  5. Valida horário (dentro do período?)
  6. Verifica conflitos de horário
    ↓
Cria agendamento no banco (status: AGENDADO)
    ↓
Envia notificações (não bloqueante):
  - WhatsApp para paciente
  - WhatsApp para profissional
    ↓
Sincroniza Google Calendar (não bloqueante):
  - Cria evento no calendário do profissional
  - Salva googleEventId no agendamento
    ↓
Retorna agendamento criado
    ↓
Frontend atualiza lista e mostra sucesso
```

---

### **2. Fluxo de Atualização de Status**

```
Usuário clica em "Confirmar" / "Finalizar" / "Cancelar"
    ↓
PUT /api/agendamentos/:id/status
    ↓
Backend (agendamentoController.ts):
  1. Valida status é válido
  2. Busca agendamento atual
  3. Valida regras:
     - Não pode alterar se já CANCELADO/FINALIZADO
     - Não pode cancelar com < 2h de antecedência
    ↓
Atualiza status no banco
    ↓
Registra no HistoricoStatus
    ↓
Envia notificações (não bloqueante)
    ↓
Sincroniza Google Calendar:
  - Se CANCELADO: deleta evento
  - Se outro status: atualiza evento
    ↓
Retorna sucesso
    ↓
Frontend atualiza interface
```

---

### **3. Fluxo de Avaliação**

```
Paciente vê agendamento FINALIZADO
    ↓
Clica em "Avaliar Atendimento"
    ↓
Modal abre com formulário (1-5 estrelas + comentário)
    ↓
POST /api/avaliacoes
    ↓
Backend (avaliacaoService.ts):
  1. Valida agendamento existe
  2. Valida status é FINALIZADO
  3. Valida não existe avaliação anterior
  4. Valida paciente é o dono do agendamento
  5. Valida nota entre 1-5
    ↓
Cria avaliação no banco
    ↓
Retorna avaliação criada
    ↓
Frontend:
  - Fecha modal
  - Remove botão "Avaliar"
  - Mostra toast de sucesso
```

---

### **4. Fluxo de Integração Google Calendar**

```
Profissional clica em "Conectar Google Calendar"
    ↓
GET /api/google-calendar/auth-url
    ↓
Backend gera URL de autenticação OAuth2
    ↓
Frontend redireciona para Google
    ↓
Usuário autoriza acesso
    ↓
Google redireciona para /api/google-calendar/callback?code=...
    ↓
Backend:
  1. Troca code por tokens (access + refresh)
  2. Criptografa tokens
  3. Salva no banco (Profissional)
    ↓
A partir de agora, ao criar/editar agendamento:
  - Cria/atualiza evento no Google Calendar
  - Salva googleEventId no agendamento
```

**Criptografia de Tokens**:
- Usa AES-256-CBC
- Chave de 32 bytes (ENCRYPTION_KEY)
- IV aleatório para cada criptografia

---

## 📱 Sistema de Notificações

### **Serviço de Notificações** (`notificacaoService.ts`)

**Canais**:
- **WhatsApp**: Via API externa (configurável)

**Janela de Silêncio**:
- Não envia notificações entre 22h e 7h
- Registra como "CRIADA" para envio posterior

**Fluxo**:
```
Evento dispara notificação (ex: novo agendamento)
    ↓
Verifica janela de silêncio
    ↓
Tenta enviar via WhatsApp
    ↓
Registra no banco:
  - Status: ENVIADA ou FALHOU
  - Detalhes de erro (se falhou)
```

**Variáveis de Ambiente**:
- `WHATSAPP_API_URL`: URL da API
- `WHATSAPP_TOKEN`: Token de autenticação
- `WHATSAPP_FROM`: Número remetente

---

## 🛡️ Regras de Negócio e Validações

### **Agendamentos**

1. **Validação de Data**:
   - Deve ser futura
   - Não pode ser no passado

2. **Validação de Horário**:
   - Deve estar dentro do período de atendimento do profissional
   - Ex: Se profissional atende 08:00-18:00, não aceita 19:00

3. **Validação de Dia da Semana**:
   - Profissional deve atender no dia escolhido
   - Ex: Se só atende SEGUNDA/QUARTA, não aceita TERÇA

4. **Conflitos de Horário**:
   - Não pode ter dois agendamentos no mesmo horário
   - Ignora agendamentos CANCELADOS

5. **Regras de Cancelamento**:
   - Não pode cancelar com menos de 2 horas antes
   - Não pode alterar status se já CANCELADO ou FINALIZADO

### **Avaliações**

1. **Apenas agendamentos FINALIZADOS**
2. **Uma avaliação por agendamento**
3. **Apenas o paciente do agendamento pode avaliar**
4. **Nota entre 1 e 5**

### **Autenticação**

1. **Senhas**: Hash bcrypt (nunca armazenadas em texto)
2. **Tokens JWT**: Expiração de 2 horas
3. **Rotas protegidas**: Todas exceto login

---

## 🔧 Estrutura de Arquivos

### **Backend**

```
backend/
├── src/
│   ├── index.ts                    # Entry point do servidor
│   ├── config/
│   │   └── prisma.ts               # Cliente Prisma
│   ├── controllers/                 # Controladores HTTP
│   │   ├── agendamentoController.ts
│   │   ├── authController.ts
│   │   ├── avaliacaoController.ts
│   │   ├── profissionalController.ts
│   │   ├── recepcionistaController.ts
│   │   └── usuarioController.ts
│   ├── services/                    # Lógica de negócio
│   │   ├── agendamentoService.ts
│   │   ├── authService.ts
│   │   ├── avaliacaoService.ts
│   │   ├── googleCalendarService.ts
│   │   ├── notificacaoService.ts
│   │   └── usuarioService.ts
│   ├── routes/                      # Definição de rotas
│   │   ├── agendamentoRoutes.ts
│   │   ├── authRoutes.ts
│   │   ├── avaliacaoRoutes.ts
│   │   └── ...
│   ├── middlewares/
│   │   └── authMiddleware.ts        # Middleware de autenticação
│   ├── types/
│   │   └── RequestComUsuario.ts    # Tipos TypeScript
│   └── utils/
│       └── validators.ts            # Funções de validação
├── prisma/
│   ├── schema.prisma               # Schema do banco
│   └── migrations/                 # Migrações do banco
└── package.json
```

### **Frontend**

```
frontend/
├── src/
│   ├── main.tsx                     # Entry point
│   ├── App.tsx                      # Componente raiz + rotas
│   ├── components/
│   │   └── GlassPage.tsx            # Componente de layout
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── paciente/
│   │   │   └── DashboardPaciente.tsx
│   │   ├── profissional/
│   │   │   ├── DashboardProfissional.tsx
│   │   │   └── components/
│   │   │       ├── Agenda.tsx
│   │   │       └── AgendamentoCard.tsx
│   │   └── recepcionista/
│   │       ├── DashboardRecepcionista.tsx
│   │       └── components/
│   │           ├── DashboardOverview.tsx
│   │           ├── UsuariosManager.tsx
│   │           ├── EspecialidadesManager.tsx
│   │           └── AgendamentosManager.tsx
│   ├── contexts/
│   │   ├── AuthContext.ts
│   │   └── AuthProvider.tsx
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── services/
│   │   └── api.ts                   # Configuração Axios
│   ├── routes/
│   │   └── PrivateRoute.tsx         # Rota protegida
│   └── utils/
│       └── getUserFromToken.ts      # Decodifica JWT
└── package.json
```

---

## 🌐 API Endpoints

### **Autenticação**
- `POST /api/auth/login` - Login (retorna JWT)
- `POST /api/auth/logout` - Logout

### **Agendamentos**
- `GET /api/agendamentos` - Lista todos (recepcionista)
- `GET /api/agendamentos/me` - Lista do paciente logado
- `GET /api/agendamentos/profissional/me` - Lista do profissional
- `GET /api/agendamentos/:id` - Busca por ID
- `POST /api/agendamentos` - Cria novo
- `PUT /api/agendamentos/:id` - Atualiza
- `PUT /api/agendamentos/:id/status` - Atualiza status
- `DELETE /api/agendamentos/:id` - Exclui

### **Avaliações**
- `POST /api/avaliacoes` - Cria avaliação
- `GET /api/avaliacoes/profissional/:id` - Lista avaliações do profissional
- `GET /api/avaliacoes/profissional/:id/estatisticas` - Estatísticas
- `GET /api/avaliacoes/me` - Minhas avaliações (profissional)

### **Usuários**
- `GET /api/usuarios/me` - Dados do usuário logado
- `PUT /api/usuarios/me` - Atualiza perfil

### **Profissionais**
- `GET /api/profissionais` - Lista todos
- `GET /api/profissionais/:id` - Busca por ID
- `PUT /api/profissionais/:id` - Atualiza

### **Google Calendar**
- `GET /api/google-calendar/auth-url` - URL de autenticação
- `GET /api/google-calendar/callback` - Callback OAuth

---

## 🎨 Design e UI/UX

### **Paleta de Cores**
- **Sand**: Tons bege/areia (principal)
- **Sage**: Tons verdes suaves
- **Ink**: Texto principal (escuro)
- **Text-muted**: Texto secundário

### **Componentes Visuais**
- **GlassPage**: Efeito glassmorphism (fundo translúcido)
- **Badges de Status**: Cores distintas por status
- **Cards**: Bordas arredondadas, sombras suaves
- **Modais**: Overlay escuro, conteúdo centralizado

### **Responsividade**
- Mobile-first
- Breakpoints Tailwind (sm, md, lg)
- Layout adaptável

---

## 🔒 Segurança

1. **Senhas**: Hash bcrypt (nunca texto plano)
2. **JWT**: Tokens com expiração
3. **Validação**: Backend valida todas as operações
4. **Autorização**: Middleware verifica permissões
5. **Tokens Google**: Criptografados no banco
6. **CORS**: Configurado para aceitar apenas frontend

---

## 🚀 Deploy e Configuração

### **Variáveis de Ambiente (Backend)**

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/clinica_db"
JWT_SECRET="chave_secreta_super_segura"
PORT=3000
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google-calendar/callback"
ENCRYPTION_KEY="chave_32_bytes_para_criptografia"
WHATSAPP_API_URL="..."
WHATSAPP_TOKEN="..."
WHATSAPP_FROM="..."
```

### **Comandos**

**Backend**:
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

---

## 📝 Pontos Importantes para Apresentação

### **1. Arquitetura Limpa**
- Separação clara: Controllers → Services → Database
- Código organizado e manutenível

### **2. Integrações**
- Google Calendar (sincronização automática)
- WhatsApp (notificações)

### **3. Validações Robustas**
- Múltiplas camadas de validação
- Regras de negócio bem definidas

### **4. Experiência do Usuário**
- Interface moderna e responsiva
- Feedback visual (toasts, badges)
- Fluxos intuitivos

### **5. Segurança**
- Autenticação JWT
- Senhas criptografadas
- Tokens criptografados

### **6. Escalabilidade**
- Prisma facilita mudanças no banco
- Código modular permite extensões

---

## ❓ Perguntas Frequentes

### **Como funciona a sincronização com Google Calendar?**
O profissional conecta sua conta Google via OAuth2. Os tokens são criptografados e salvos. Quando um agendamento é criado/editado, o sistema cria/atualiza automaticamente o evento no calendário do profissional.

### **Como as notificações são enviadas?**
O sistema usa uma API externa de WhatsApp. As notificações são enviadas de forma assíncrona (não bloqueiam a operação principal) e são registradas no banco para auditoria.

### **Por que não posso cancelar com menos de 2 horas?**
É uma regra de negócio para evitar cancelamentos de última hora e garantir que o profissional tenha tempo de reagendar ou avisar outros pacientes.

### **Como funciona o sistema de avaliações?**
Apenas agendamentos FINALIZADOS podem ser avaliados. Cada agendamento pode ter apenas uma avaliação. O paciente avalia com nota (1-5) e comentário opcional.

### **O que acontece se o Google Calendar falhar?**
O sistema não bloqueia a operação. Se a sincronização falhar, apenas registra um log de erro, mas o agendamento é criado normalmente no sistema.

---

## 📚 Tecnologias Utilizadas

### **Backend**
- Node.js 18+
- TypeScript 5.8
- Express.js 4.21
- Prisma 6.19
- PostgreSQL
- JWT
- bcryptjs
- googleapis
- axios

### **Frontend**
- React 19
- TypeScript 5.8
- Vite 7.0
- Tailwind CSS 3.4
- React Router DOM 7.7
- Axios 1.11
- React Toastify 11.0
- Lucide React (ícones)

---

## 🎓 Conclusão

Este sistema é uma solução completa para gerenciamento de agendamentos em clínicas, com:
- ✅ Interface moderna e intuitiva
- ✅ Backend robusto e seguro
- ✅ Integrações com serviços externos
- ✅ Validações e regras de negócio bem definidas
- ✅ Código organizado e manutenível
- ✅ Experiência do usuário otimizada

---

**Desenvolvido com foco em qualidade, segurança e usabilidade.**

