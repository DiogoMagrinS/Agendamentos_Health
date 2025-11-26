// src/routes/agendamentoRoutes.ts
// Correção: rotas ordenadas (/me antes de /:id), sem duplicação, autenticação aplicada
import { Router } from 'express';
import {
  getAgendamentos,
  getAgendamentoPorId,
  postAgendamento,
  putAgendamento,
  deleteAgendamento,
  atualizarStatus,
  listarAgendamentosUsuario,
  listarAgendamentosProfissional,
  editarObservacoes,
  getHistoricoStatus
} from '../controllers/agendamentoController';
import { autenticarToken } from '../middlewares/authMiddleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(autenticarToken);

// Rotas específicas (antes de /:id)
router.get('/me', listarAgendamentosUsuario);
router.get('/profissional/me', listarAgendamentosProfissional);
router.patch('/:id/status', atualizarStatus);
router.patch('/:id/observacoes', editarObservacoes);
router.get('/:id/historico', getHistoricoStatus);

// Rotas CRUD
router.get('/', getAgendamentos);
router.get('/:id', getAgendamentoPorId);
router.post('/', postAgendamento);
router.put('/:id', putAgendamento);
router.delete('/:id', deleteAgendamento);

export default router;
