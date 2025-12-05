# ❓ Perguntas e Respostas - Sistema de Agendamento

## 🔐 Segurança e Autenticação

### **Como funciona a autenticação?**
O sistema usa JWT (JSON Web Tokens). Quando o usuário faz login, o backend gera um token que contém o ID, email e tipo do usuário. Este token é enviado em todas as requisições no header `Authorization: Bearer <token>`. O token expira em 2 horas.

### **As senhas são seguras?**
Sim! As senhas são criptografadas usando bcrypt, uma biblioteca de hash unidirecional. Nunca armazenamos senhas em texto plano no banco de dados.

### **Como funciona a autorização?**
Cada rota protegida usa o middleware `autenticarToken` que verifica se o token é válido e anexa os dados do usuário na requisição. Assim, o backend sabe quem está fazendo a requisição e pode validar permissões.

---

## 📅 Agendamentos

### **Como o sistema evita conflitos de horário?**
Antes de criar um agendamento, o sistema verifica se já existe outro agendamento para o mesmo profissional no mesmo horário. Se existir (e não estiver cancelado), retorna erro.

### **Por que não posso cancelar com menos de 2 horas?**
É uma regra de negócio para evitar cancelamentos de última hora. Isso dá tempo para o profissional reagendar ou avisar outros pacientes da lista de espera. A regra é validada no backend.

### **O que acontece se eu tentar agendar em um horário que o profissional não atende?**
O sistema valida três coisas:
1. A data é futura?
2. O profissional atende neste dia da semana?
3. O horário está dentro do período de atendimento (ex: 08:00-18:00)?

Se alguma validação falhar, retorna erro explicativo.

### **Posso editar um agendamento já finalizado?**
Não. Agendamentos com status `CANCELADO` ou `FINALIZADO` não podem mais ser alterados. Isso garante a integridade dos dados históricos.

---

## ⭐ Avaliações

### **Quem pode avaliar?**
Apenas o paciente que fez o agendamento pode avaliar, e apenas se o agendamento estiver com status `FINALIZADO`.

### **Posso avaliar mais de uma vez?**
Não. Cada agendamento pode ter apenas uma avaliação. Após avaliar, o botão "Avaliar" desaparece.

### **Como funciona a nota?**
A nota vai de 1 a 5 estrelas. O paciente também pode adicionar um comentário opcional. A avaliação fica vinculada ao profissional e pode ser visualizada por ele e por outros pacientes ao escolher profissionais.

### **O profissional vê as avaliações?**
Sim! O profissional tem uma seção "Minhas Avaliações" no dashboard onde vê todas as avaliações recebidas, com nota, comentário e nome do paciente.

---

## 🔗 Google Calendar

### **Como funciona a integração?**
O profissional conecta sua conta Google via OAuth2. Os tokens de acesso são criptografados e salvos no banco. Quando um agendamento é criado/editado, o sistema automaticamente cria/atualiza o evento no calendário do profissional.

### **Os tokens são seguros?**
Sim! Os tokens são criptografados usando AES-256-CBC antes de serem salvos no banco. A chave de criptografia está nas variáveis de ambiente.

### **O que acontece se a sincronização falhar?**
A sincronização é feita de forma assíncrona (não bloqueante). Se falhar, apenas registra um log de erro, mas o agendamento é criado normalmente no sistema. O usuário não é afetado.

### **Preciso conectar o Google Calendar?**
Não é obrigatório. Se o profissional não conectar, os agendamentos funcionam normalmente, apenas não aparecem no Google Calendar.

---

## 📱 Notificações

### **Como funcionam as notificações?**
O sistema envia notificações via WhatsApp quando:
- Um novo agendamento é criado
- Um agendamento é cancelado
- Um agendamento é editado (mudança de data/hora)
- Lembretes de consulta

### **Há algum horário que não envia notificações?**
Sim! Entre 22h e 7h (janela de silêncio), as notificações são registradas mas não enviadas imediatamente, para não incomodar os usuários.

### **O que acontece se a notificação falhar?**
O sistema registra no banco de dados com status `FALHOU` e detalhes do erro. Isso permite auditoria e retentativas futuras.

---

## 🗄️ Banco de Dados

### **Qual banco de dados é usado?**
PostgreSQL, gerenciado pelo Prisma ORM.

### **Como são feitas as mudanças no banco?**
Através de migrações do Prisma. Cada mudança no schema gera uma migração que pode ser aplicada com `npx prisma migrate dev`.

### **O que é o Prisma?**
Prisma é um ORM (Object-Relational Mapping) que facilita o trabalho com banco de dados. Ele gera tipos TypeScript automaticamente baseado no schema, garantindo type-safety.

---

## 🎨 Interface

### **O sistema é responsivo?**
Sim! O design é mobile-first e funciona bem em celulares, tablets e desktops.

### **Qual tecnologia de estilização é usada?**
Tailwind CSS, uma framework utility-first que permite criar interfaces rapidamente com classes pré-definidas.

### **O que é o efeito "glassmorphism"?**
É o efeito visual de vidro fosco/translúcido usado no componente `GlassPage`. Cria uma aparência moderna e elegante.

---

## 🔧 Arquitetura

### **Por que separar em Services e Controllers?**
- **Controllers**: Lidam com HTTP (requisições/respostas)
- **Services**: Contêm a lógica de negócio

Isso facilita manutenção, testes e reutilização de código.

### **Como funciona o fluxo de uma requisição?**
```
Cliente (Frontend)
    ↓
Rota (routes/)
    ↓
Middleware (authMiddleware) - valida token
    ↓
Controller (controllers/) - recebe requisição
    ↓
Service (services/) - lógica de negócio
    ↓
Prisma - banco de dados
    ↓
Resposta ao cliente
```

---

## 🚀 Deploy

### **Como fazer deploy?**
1. Configure as variáveis de ambiente
2. Execute as migrações do Prisma
3. Compile o backend (`npm run build`)
4. Inicie o servidor (`npm start`)
5. Para o frontend, faça build (`npm run build`) e sirva os arquivos estáticos

### **Quais variáveis de ambiente são necessárias?**
- `DATABASE_URL`: String de conexão PostgreSQL
- `JWT_SECRET`: Chave secreta para JWT
- `PORT`: Porta do servidor (opcional, padrão 3000)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`: Para Google Calendar
- `ENCRYPTION_KEY`: Chave de 32 bytes para criptografia
- `WHATSAPP_API_URL`, `WHATSAPP_TOKEN`, `WHATSAPP_FROM`: Para notificações

---

## 🐛 Problemas Comuns

### **Erro: "Token inválido ou expirado"**
O token JWT expirou (válido por 2h). Faça login novamente.

### **Erro: "Horário já agendado"**
Já existe outro agendamento para este profissional neste horário. Escolha outro horário.

### **Erro: "Profissional não atende neste dia"**
O profissional não trabalha no dia da semana escolhido. Verifique os dias de atendimento.

### **Erro: "Cancelamentos só são permitidos até 2 horas antes"**
Você tentou cancelar muito próximo do horário da consulta. Entre em contato com a clínica.

### **Google Calendar não sincroniza**
Verifique se:
1. O profissional conectou a conta Google
2. As variáveis de ambiente do Google estão configuradas
3. Os tokens não expiraram (o sistema renova automaticamente)

---

## 📊 Funcionalidades Específicas

### **Como o recepcionista adiciona uma foto para um paciente?**
No dashboard do recepcionista, na aba "Usuários", há um botão para adicionar/editar foto. O recepcionista pode fazer isso para qualquer usuário.

### **O paciente pode adicionar sua própria foto?**
Sim! No dashboard do paciente, há um botão "Atualizar foto (URL)" no header que permite adicionar uma URL de imagem.

### **Como funciona o histórico de status?**
Toda vez que o status de um agendamento muda, é registrado na tabela `HistoricoStatus`. Isso permite auditoria e rastreabilidade.

### **O que são os badges de status?**
São indicadores visuais coloridos:
- 🟡 **AGENDADO**: Amarelo (status inicial)
- 🟢 **CONFIRMADO**: Verde (confirmado pelo profissional)
- 🔴 **CANCELADO**: Vermelho (cancelado)
- ✅ **FINALIZADO**: Azul (consulta realizada)

---

## 🎓 Conceitos Técnicos

### **O que é JWT?**
JSON Web Token - um padrão para transmitir informações de forma segura entre partes. No nosso caso, contém dados do usuário autenticado.

### **O que é OAuth2?**
Protocolo de autorização usado para permitir que aplicações acessem recursos de terceiros (como Google Calendar) sem expor senhas.

### **O que é bcrypt?**
Algoritmo de hash de senhas. É unidirecional (não pode ser revertido) e lento propositalmente para dificultar ataques de força bruta.

### **O que é Prisma?**
ORM (Object-Relational Mapping) que facilita trabalhar com banco de dados em TypeScript, gerando tipos automaticamente e simplificando queries.

---

## 🔄 Fluxos Detalhados

### **Fluxo completo de um agendamento:**
1. Paciente escolhe especialidade
2. Sistema lista profissionais da especialidade (com avaliações)
3. Paciente escolhe profissional
4. Sistema valida disponibilidade e horários
5. Paciente escolhe data/hora
6. Sistema valida conflitos
7. Agendamento criado (status: AGENDADO)
8. Notificações enviadas (paciente + profissional)
9. Evento criado no Google Calendar (se conectado)
10. Agendamento aparece nas listas

### **Fluxo de avaliação:**
1. Profissional finaliza consulta (status: FINALIZADO)
2. Paciente vê botão "Avaliar" no agendamento
3. Paciente clica e preenche nota (1-5) + comentário
4. Avaliação criada no banco
5. Botão "Avaliar" desaparece
6. Profissional vê avaliação em "Minhas Avaliações"

---

## 💡 Dicas para Apresentação

### **Pontos Fortes para Destacar:**
1. ✅ **Segurança**: Senhas criptografadas, JWT, tokens criptografados
2. ✅ **Validações**: Múltiplas camadas de validação
3. ✅ **Integrações**: Google Calendar e WhatsApp
4. ✅ **UX**: Interface moderna e intuitiva
5. ✅ **Arquitetura**: Código organizado e manutenível
6. ✅ **Regras de Negócio**: Bem definidas e implementadas

### **Demonstração Sugerida:**
1. Login como paciente
2. Criar um agendamento
3. Mostrar validações (tentar horário inválido)
4. Login como profissional
5. Mostrar agenda e confirmar agendamento
6. Mostrar integração Google Calendar
7. Login como recepcionista
8. Mostrar dashboard e gerenciamento

---

**Para mais detalhes técnicos, consulte `DOCUMENTACAO_PROJETO.md`**

