import { prisma } from '../config/prisma';

export async function criarAvaliacao(data: {
  agendamentoId: number;
  profissionalId: number;
  pacienteId: number;
  nota: number;
  comentario?: string;
}) {
  // Verifica se o agendamento existe e está finalizado
  const agendamento = await prisma.agendamento.findUnique({
    where: { id: data.agendamentoId }
  });

  if (!agendamento) {
    throw new Error('Agendamento não encontrado');
  }

  if (agendamento.status !== 'FINALIZADO') {
    throw new Error('Apenas agendamentos finalizados podem ser avaliados');
  }

  // Verifica se já existe uma avaliação para este agendamento
  const avaliacaoExistente = await prisma.avaliacao.findUnique({
    where: { agendamentoId: data.agendamentoId }
  });

  if (avaliacaoExistente) {
    throw new Error('Este agendamento já foi avaliado');
  }

  // Verifica se o paciente é o dono do agendamento
  if (agendamento.pacienteId !== data.pacienteId) {
    throw new Error('Você não pode avaliar este agendamento');
  }

  // Valida a nota (1 a 5)
  if (data.nota < 1 || data.nota > 5) {
    throw new Error('A nota deve ser entre 1 e 5');
  }

  return prisma.avaliacao.create({
    data: {
      agendamentoId: data.agendamentoId,
      profissionalId: data.profissionalId,
      pacienteId: data.pacienteId,
      nota: data.nota,
      comentario: data.comentario
    },
    include: {
      paciente: {
        select: { id: true, nome: true }
      }
    }
  });
}

export async function listarAvaliacoesDoProfissional(profissionalId: number) {
  return prisma.avaliacao.findMany({
    where: { profissionalId },
    include: {
      paciente: {
        select: { id: true, nome: true }
      },
      agendamento: {
        select: { data: true }
      }
    },
    orderBy: { criadoEm: 'desc' }
  });
}

export async function obterEstatisticasAvaliacao(profissionalId: number) {
  const avaliacoes = await prisma.avaliacao.findMany({
    where: { profissionalId },
    select: { nota: true }
  });

  if (avaliacoes.length === 0) {
    return {
      media: 0,
      total: 0,
      distribuicao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const total = avaliacoes.length;
  const soma = avaliacoes.reduce((acc: number, a: any) => acc + a.nota, 0);
  const media = soma / total;

  const distribuicao = avaliacoes.reduce((acc: Record<number, number>, a: any) => {
    acc[a.nota as keyof typeof acc] = (acc[a.nota as keyof typeof acc] || 0) + 1;
    return acc;
  }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>);

  return {
    media: Math.round(media * 10) / 10, // Arredonda para 1 casa decimal
    total,
    distribuicao
  };
}

export async function listarProfissionaisComAvaliacoes() {
  const profissionais = await prisma.profissional.findMany({
    include: {
      usuario: {
        select: { nome: true, email: true }
      },
      especialidade: true
    }
  });

  // Adiciona estatísticas de avaliação para cada profissional
  const profissionaisComStats = await Promise.all(
    profissionais.map(async (prof) => {
      const stats = await obterEstatisticasAvaliacao(prof.id);
      // Busca avaliações do profissional
      const avaliacoes = await prisma.avaliacao.findMany({
        where: { profissionalId: prof.id },
        include: {
          paciente: {
            select: { nome: true }
          }
        },
        orderBy: { criadoEm: 'desc' },
        take: 5
      });
      
      return {
        ...prof,
        avaliacaoMedia: stats.media,
        totalAvaliacoes: stats.total,
        avaliacoes
      };
    })
  );

  return profissionaisComStats;
}

