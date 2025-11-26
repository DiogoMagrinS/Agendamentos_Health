// src/controllers/profissionalController.ts
// Correção: controller adaptado ao serviço (usando funções exportadas), respostas HTTP consistentes
import { Request, Response } from 'express';
import {
  listarProfissionais,
  buscarProfissionalPorId,
  criarProfissional,
  atualizarProfissional,
  excluirProfissional,
  getAgendaProfissional
} from '../services/profissionalService';
import { prisma } from '../config/prisma';
import { StatusAgendamento } from '@prisma/client';

export async function getProfissionais(req: Request, res: Response) {
  try {
    const especialidadeId = req.query.especialidade ? parseInt(req.query.especialidade as string) : undefined;
    const dados = await listarProfissionais(especialidadeId);
    return res.json(dados);
  } catch (error: any) {
    console.error('Erro ao buscar profissionais:', error);
    return res.status(500).json({ erro: 'Erro ao buscar profissionais', detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
}

export async function getProfissionalPorId(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  try {
    const profissional = await buscarProfissionalPorId(id);
    return res.json(profissional);
  } catch (error: any) {
    console.error('getProfissionalPorId:', error);
    return res.status(404).json({ erro: error.message || 'Profissional não encontrado' });
  }
}

export async function postProfissional(req: Request, res: Response) {
  try {
    const novo = await criarProfissional(req.body);
    return res.status(201).json(novo);
  } catch (error: any) {
    console.error('postProfissional:', error);
    return res.status(400).json({ erro: error.message || 'Erro ao criar profissional' });
  }
}

export async function putProfissional(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  try {
    const atualizado = await atualizarProfissional(id, req.body);
    return res.json(atualizado);
  } catch (error: any) {
    console.error('putProfissional:', error);
    return res.status(400).json({ erro: error.message || 'Erro ao atualizar profissional' });
  }
}

export async function deleteProfissional(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  try {
    await excluirProfissional(id);
    return res.status(204).send();
  } catch (error: any) {
    console.error('deleteProfissional:', error);
    return res.status(400).json({ erro: error.message || 'Erro ao excluir profissional' });
  }
}

/**
 * GET /api/profissionais/:id/disponibilidade?data=YYYY-MM-DD
 * Retorna slots de 30 minutos livres (HH:MM) conforme horaInicio/horaFim e agendamentos existentes
 */
export async function getDisponibilidade(req: Request, res: Response) {
  const profissionalId = parseInt(req.params.id);
  const data = (req.query.data as string) || '';

  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return res.status(400).json({ erro: 'Parâmetro "data" é obrigatório no formato YYYY-MM-DD.' });
  }

  try {
    const profissional = await prisma.profissional.findUnique({ where: { id: profissionalId } });
    if (!profissional) return res.status(404).json({ erro: 'Profissional não encontrado.' });

    // diasAtendimento pode ser array ou null
    const diasAtendimento: string[] = Array.isArray(profissional.diasAtendimento) ? (profissional.diasAtendimento as string[]) : [];

    const d = new Date(`${data}T00:00:00`);
    const day = d.getDay();
    const mapDia = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
    const diaSemana = mapDia[day];

    if (!diasAtendimento.includes(diaSemana)) return res.json([]);

    const gerarSlots = (inicio: string, fim: string) => {
      const slots: string[] = [];
      const start = new Date(`${data}T${inicio}:00`);
      const end = new Date(`${data}T${fim}:00`);
      let cur = new Date(start);
      while (cur < end) {
        slots.push(cur.toTimeString().slice(0, 5));
        cur.setMinutes(cur.getMinutes() + 30);
      }
      return slots;
    };

    const todosHorarios = gerarSlots(profissional.horaInicio, profissional.horaFim);

    // busca agendamentos do dia (não cancelados)
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        profissionalId,
        status: { not: StatusAgendamento.CANCELADO },
        data: {
          gte: new Date(`${data}T00:00:00`),
          lt: new Date(`${data}T23:59:59`)
        }
      },
      select: { data: true }
    });

    const ocupadosSet = new Set(agendamentos.map((a: { data: Date }) => new Date(a.data).toTimeString().slice(0, 5)));
    const livres = todosHorarios.filter(h => !ocupadosSet.has(h));
    return res.json(livres);
  } catch (e: any) {
    console.error('getDisponibilidade error:', e);
    return res.status(500).json({ erro: 'Erro ao calcular disponibilidade.' });
  }
}

export async function getAgendamentosDoProfissional(req: Request, res: Response) {
  const profissionalId = parseInt(req.params.id);

  try {
    const hoje = new Date();
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        profissionalId,
        data: { gte: hoje },
        status: { not: StatusAgendamento.CANCELADO }
      },
      include: {
        paciente: { select: { id: true, nome: true, email: true } }
      },
      orderBy: { data: 'asc' }
    });

    const agrupados: Record<string, typeof agendamentos> = {};
    agendamentos.forEach((a) => {
      const dia = (a.data instanceof Date) ? a.data.toISOString().split('T')[0] : new Date(a.data).toISOString().split('T')[0];
      if (!agrupados[dia]) agrupados[dia] = [];
      agrupados[dia].push(a);
    });

    return res.json(agrupados);
  } catch (error: any) {
    console.error('getAgendamentosDoProfissional:', error);
    return res.status(500).json({ erro: 'Erro ao buscar agendamentos do profissional.' });
  }
}
