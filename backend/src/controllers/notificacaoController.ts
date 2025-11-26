import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export async function listarNotificacoes(req: Request, res: Response) {
  try {
    const { destinatarioId, status, tipo } = req.query;
    const where: any = {};

    if (destinatarioId) where.destinatarioId = Number(destinatarioId);
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;

    const notificacoes = await prisma.notificacao.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: 200,
    });

    res.json(notificacoes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao listar notificações' });
  }
}


