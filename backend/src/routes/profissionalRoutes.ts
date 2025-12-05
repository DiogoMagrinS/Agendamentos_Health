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

router.use(autenticarToken);

router.get('/:id/disponibilidade', getDisponibilidade);
router.get('/:id/agendamentos', getAgendamentosDoProfissional); // ✅ nova rota

router.get('/', getProfissionais);
router.get('/:id', getProfissionalPorId);
router.post('/', postProfissional);
router.put('/:id', putProfissional);
router.delete('/:id', deleteProfissional);
export default router;
