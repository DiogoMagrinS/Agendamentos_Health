// src/routes/profissionalRoutes.ts
// Correção: define rotas na ordem correta e aplica autenticação globalmente
import { Router } from 'express';
import {
  getProfissionais,
  getProfissionalPorId,
  postProfissional,
  putProfissional,
  deleteProfissional,
  getDisponibilidade,
  getAgendamentosDoProfissional,
} from '../controllers/profissionalController';
import { autenticarToken } from '../middlewares/authMiddleware';

const router = Router();

// Aplica autenticação para todas as rotas deste router
router.use(autenticarToken);

// Rota para disponibilidade e agenda do profissional (rotas específicas primeiro)
router.get('/:id/disponibilidade', getDisponibilidade);
router.get('/:id/agendamentos', getAgendamentosDoProfissional);

// Rotas CRUD padrão
router.get('/', getProfissionais);
router.get('/:id', getProfissionalPorId);
router.post('/', postProfissional);
router.put('/:id', putProfissional);
router.delete('/:id', deleteProfissional);

export default router;
