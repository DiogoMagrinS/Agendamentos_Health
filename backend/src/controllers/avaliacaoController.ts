import { Request, Response } from 'express';
import {
  criarAvaliacao,
  listarAvaliacoesDoProfissional,
  obterEstatisticasAvaliacao,
  listarProfissionaisComAvaliacoes
} from '../services/avaliacaoService';
import { prisma } from '../config/prisma';

export async function postAvaliacao(req: Request, res: Response) {
  try {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Token inválido ou ausente.' });
    }

    const { agendamentoId, nota, comentario } = req.body;
    const pacienteId = req.usuario.id;

    if (!agendamentoId || !nota) {
      return res.status(400).json({ erro: 'agendamentoId e nota são obrigatórios.' });
    }

    // Busca o agendamento para obter o profissionalId
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: parseInt(agendamentoId) },
      include: { profissional: true }
    });

    if (!agendamento) {
      return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    }

    const avaliacao = await criarAvaliacao({
      agendamentoId: parseInt(agendamentoId),
      profissionalId: agendamento.profissionalId,
      pacienteId,
      nota: parseInt(nota),
      comentario: comentario || undefined
    });

    res.status(201).json(avaliacao);
  } catch (error: any) {
    console.error('Erro ao criar avaliação:', error);
    res.status(400).json({ erro: error.message || 'Erro ao criar avaliação.' });
  }
}

export async function getAvaliacoesProfissional(req: Request, res: Response) {
  try {
    const profissionalId = parseInt(req.params.id);
    const avaliacoes = await listarAvaliacoesDoProfissional(profissionalId);
    res.json(avaliacoes);
  } catch (error: any) {
    res.status(400).json({ erro: error.message });
  }
}

export async function getEstatisticasAvaliacao(req: Request, res: Response) {
  try {
    const profissionalId = parseInt(req.params.id);
    const stats = await obterEstatisticasAvaliacao(profissionalId);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ erro: error.message });
  }
}

export async function getProfissionaisComAvaliacoes(req: Request, res: Response) {
  try {
    const profissionais = await listarProfissionaisComAvaliacoes();
    res.json(profissionais);
  } catch (error: any) {
    res.status(400).json({ erro: error.message });
  }
}

