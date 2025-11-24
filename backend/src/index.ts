import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import usuarioRoutes from './routes/usuarioRoutes';
import especialidadeRoutes from './routes/especialidadeRoutes';
import authRoutes from './routes/authRoutes';
import profissionalRoutes from './routes/profissionalRoutes';
import agendamentoRoutes from './routes/agendamentoRoutes';
import recepcionistaRoutes from "./routes/recepcionistaRoutes";
import avaliacaoRoutes from './routes/avaliacaoRoutes';
import googleCalendarRoutes from './routes/googleCalendarRoutes';
// import notificacaoRoutes from './routes/notificacaoRoutes'; // Comentado - arquivo não existe ainda

dotenv.config(); // Carrega variáveis do .env

const app = express();
const prisma = new PrismaClient();

// Middlewares globais
app.use(cors());
app.use(express.json());

// Rotas protegidas e públicas
app.use('/api/usuarios', usuarioRoutes);          
app.use('/api/especialidades', especialidadeRoutes); 
app.use('/api/auth', authRoutes);   
app.use('/api/profissionais', profissionalRoutes);  
app.use('/api/agendamentos', agendamentoRoutes);           
app.use("/api/recepcionista", recepcionistaRoutes);
app.use('/api/avaliacoes', avaliacaoRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
// app.use('/api/notificacoes', notificacaoRoutes); // Comentado - arquivo não existe ainda

// Healthcheck
app.get('/healthcheck', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Servidor funcionando' });
});

// Rota raiz
app.get('/', (req, res) => {
  res.send('API do Sistema de Agendamento - v1');
});

const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_ATTEMPTS = 5;

function startServer(port: number, attemptsLeft: number = MAX_PORT_ATTEMPTS) {
  const server = app.listen(port, () => {
    console.log(`[HTTP] Servidor rodando na porta ${port}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`[HTTP] Porta ${port} em uso. Tentando porta ${port + 1}...`);
      startServer(port + 1, attemptsLeft - 1);
    } else {
      console.error('[HTTP] Não foi possível iniciar o servidor:', error.message);
      process.exit(1);
    }
  });
}

startServer(DEFAULT_PORT);

// Encerra conexão do Prisma em caso de interrupção (Ctrl+C, etc.)
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
