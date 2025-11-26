// src/services/agendamentoService.ts
// Correção: implementa funções exportadas (criar, listar, atualizar, excluir, listar por usuário/profissional, observar histórico, etc.)
// Observação: usa imports dinâmicos para notificações e Google Calendar (não bloqueiam operação)
import { prisma } from '../config/prisma';
import { StatusAgendamento, DiaSemana } from '@prisma/client';
import { validarDataFutura } from '../utils/validators';

async function enviarNotificacaoSegura(dados: any) {
  try {
    const mod = await import('./notificacaoService');
    if (mod && mod.enviarNotificacao) {
      await mod.enviarNotificacao(dados);
    }
  } catch (err) {
    console.warn('enviarNotificacaoSegura falhou (não crítico):', err);
  }
}

async function sincronizarGoogleCalendarSegura(acao: 'criar' | 'atualizar' | 'deletar', profissionalId: number, agendamentoId: number) {
  try {
    const mod = await import('./googleCalendarService');
    if (!mod) {
      console.warn('Google Calendar module ausente');
      return;
    }
    switch (acao) {
      case 'criar':
        if (mod.createCalendarEvent) await mod.createCalendarEvent(profissionalId, agendamentoId);
        break;
      case 'atualizar':
        if (mod.updateCalendarEvent) await mod.updateCalendarEvent(profissionalId, agendamentoId);
        break;
      case 'deletar':
        if (mod.deleteCalendarEvent) await mod.deleteCalendarEvent(profissionalId, agendamentoId);
        break;
    }
  } catch (err) {
    console.warn('sincronizarGoogleCalendarSegura erro (não crítico):', err);
  }
}

export async function listarAgendamentos() {
  return prisma.agendamento.findMany({
    include: {
      paciente: true,
      profissional: {
        include: {
          usuario: true,
          especialidade: true
        }
      }
    },
    orderBy: { data: 'asc' }
  });
}

export async function buscarAgendamentoPorId(id: number) {
  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: {
      paciente: true,
      profissional: {
        include: { usuario: true, especialidade: true }
      }
    }
  });
  if (!agendamento) throw new Error('Agendamento não encontrado');
  return agendamento;
}

export async function criarAgendamento(data: {
  pacienteId: number;
  profissionalId: number;
  data: Date;
  observacoes?: string | null;
}) {
  // valida paciente
  const paciente = await prisma.usuario.findUnique({ where: { id: data.pacienteId } });
  if (!paciente) throw new Error('Paciente não encontrado');
  if (paciente.tipo !== 'PACIENTE') throw new Error('Usuário não é um paciente');

  // valida profissional
  const profissional = await prisma.profissional.findUnique({ 
    where: { id: data.profissionalId },
    include: { especialidade: true }
  });
  if (!profissional) throw new Error('Profissional não encontrado');

  const dataAgendamento = new Date(data.data);
  if (isNaN(dataAgendamento.getTime())) throw new Error('Data inválida');
  
  // Valida se a data é futura
  const dataValida = validarDataFutura(dataAgendamento);
  if (!dataValida.valida) throw new Error(dataValida.erro);

  // Valida dia da semana (0 = domingo, 1 = segunda, ..., 6 = sábado)
  const diaSemanaNumero = dataAgendamento.getDay();
  const diasSemanaMap: Record<number, DiaSemana> = {
    0: 'DOMINGO',
    1: 'SEGUNDA',
    2: 'TERCA',
    3: 'QUARTA',
    4: 'QUINTA',
    5: 'SEXTA',
    6: 'SABADO',
  };
  const diaSemanaEnum = diasSemanaMap[diaSemanaNumero];
  
  if (!diaSemanaEnum || !profissional.diasAtendimento.includes(diaSemanaEnum)) {
    throw new Error('Profissional não atende neste dia da semana');
  }

  // Valida horário de atendimento
  const horaAgendamento = dataAgendamento.toTimeString().slice(0, 5); // HH:MM
  if (horaAgendamento < profissional.horaInicio || horaAgendamento >= profissional.horaFim) {
    throw new Error(`Horário fora do período de atendimento (${profissional.horaInicio} - ${profissional.horaFim})`);
  }

  // verifica conflito (mesma data/hora)
  const conflito = await prisma.agendamento.findFirst({
    where: {
      profissionalId: data.profissionalId,
      data: dataAgendamento,
      status: { not: StatusAgendamento.CANCELADO }
    }
  });
  if (conflito) throw new Error('Horário já agendado');

  const agendamento = await prisma.agendamento.create({
    data: {
      pacienteId: data.pacienteId,
      profissionalId: data.profissionalId,
      data: dataAgendamento,
      observacoes: data.observacoes ?? null
    }
  });

  // busca info do profissional (usuario) para mensagens
  const profissionalUsuario = await prisma.profissional.findUnique({
    where: { id: data.profissionalId },
    include: { usuario: true },
  });

  // envia notificações (não bloqueante)
  if (paciente) {
    await enviarNotificacaoSegura({
      tipo: 'NOVO_AGENDAMENTO',
      canal: 'WHATSAPP',
      destinatario: {
        idUsuario: paciente.id,
        tipoUsuario: paciente.tipo,
        nome: paciente.nome,
        telefone: paciente.telefone || '',
      },
      conteudo: '',
      meta: {
        data: dataAgendamento.toLocaleString('pt-BR'),
        profissional: profissionalUsuario?.usuario?.nome ?? null
      },
      agendamentoId: agendamento.id,
    }).catch(() => {});
  }

  if (profissionalUsuario?.usuario) {
    await enviarNotificacaoSegura({
      tipo: 'NOVO_AGENDAMENTO_PROFISSIONAL',
      canal: 'WHATSAPP',
      destinatario: {
        idUsuario: profissionalUsuario.usuario.id,
        tipoUsuario: profissionalUsuario.usuario.tipo,
        nome: profissionalUsuario.usuario.nome,
        telefone: profissionalUsuario.usuario.telefone || '',
      },
      conteudo: '',
      meta: {
        data: dataAgendamento.toLocaleString('pt-BR'),
        paciente: paciente.nome,
      },
      agendamentoId: agendamento.id,
    }).catch(() => {});
  }

  // sincroniza com Google Calendar (não bloqueante)
  await sincronizarGoogleCalendarSegura('criar', data.profissionalId, agendamento.id).catch(() => {});

  return agendamento;
}

export async function atualizarAgendamento(
  id: number,
  dados: Partial<{
    pacienteId: number;
    profissionalId: number;
    data: Date;
    status: string;
    observacoes?: string | null;
  }>
) {
  const agendamentoExistente = await prisma.agendamento.findUnique({
    where: { id },
    include: {
      paciente: true,
      profissional: { include: { usuario: true } },
    }
  });

  if (!agendamentoExistente) throw new Error('Agendamento não encontrado');

  const dataAtualizada = dados.data ? new Date(dados.data) : undefined;
  if (dataAtualizada && dataAtualizada <= new Date()) throw new Error('A data do agendamento deve estar no futuro');

  if (dados.profissionalId && dataAtualizada) {
    const conflito = await prisma.agendamento.findFirst({
      where: {
        profissionalId: dados.profissionalId,
        data: dataAtualizada,
        NOT: { id }
      }
    });
    if (conflito) throw new Error('Este horário já está ocupado para o profissional');
  }

  const statusAlterado = dados.status && dados.status !== agendamentoExistente.status;
  const dataAnterior = agendamentoExistente.data;

  const atualizado = await prisma.agendamento.update({
    where: { id },
    data: {
      pacienteId: dados.pacienteId ?? undefined,
      profissionalId: dados.profissionalId ?? undefined,
      data: dataAtualizada ?? undefined,
      status: dados.status ? (dados.status as StatusAgendamento) : undefined,
      observacoes: dados.observacoes ?? undefined,
    }
  });

  // registra histórico se status mudou
  if (statusAlterado && dados.status) {
    await prisma.historicoStatus.create({
      data: {
        agendamentoId: id,
        status: dados.status as StatusAgendamento
      }
    });
  }

  // notificações se data mudou
  const paciente = agendamentoExistente.paciente;
  const profissionalUsuario = agendamentoExistente.profissional.usuario;
  const dataMudou = dataAtualizada && dataAtualizada.getTime() !== new Date(dataAnterior).getTime();

  if (dataMudou) {
    const resumo = `Nova data/horário: ${dataAtualizada?.toLocaleString('pt-BR')}`;

    if (paciente) {
      await enviarNotificacaoSegura({
        tipo: 'EDICAO',
        canal: 'WHATSAPP',
        destinatario: {
          idUsuario: paciente.id,
          tipoUsuario: paciente.tipo,
          nome: paciente.nome,
          telefone: paciente.telefone || '',
        },
        conteudo: `Seu agendamento foi atualizado. ${resumo}`,
        meta: { agendamentoId: atualizado.id },
        agendamentoId: atualizado.id,
      }).catch(() => {});
    }

    if (profissionalUsuario) {
      await enviarNotificacaoSegura({
        tipo: 'EDICAO_PROFISSIONAL',
        canal: 'WHATSAPP',
        destinatario: {
          idUsuario: profissionalUsuario.id,
          tipoUsuario: profissionalUsuario.tipo,
          nome: profissionalUsuario.nome,
          telefone: profissionalUsuario.telefone,
        },
        conteudo: `Um agendamento da sua agenda foi atualizado. ${resumo}`,
        meta: { agendamentoId: atualizado.id },
        agendamentoId: atualizado.id,
      }).catch(() => {});
    }
  }

  if (dados.status && dados.status === StatusAgendamento.CANCELADO) {
    if (profissionalUsuario) {
      await enviarNotificacaoSegura({
        tipo: 'CANCELAMENTO',
        canal: 'WHATSAPP',
        destinatario: {
          idUsuario: profissionalUsuario.id,
          tipoUsuario: profissionalUsuario.tipo,
          nome: profissionalUsuario.nome,
          telefone: profissionalUsuario.telefone,
        },
        conteudo: `Um agendamento foi cancelado (${agendamentoExistente.data.toLocaleString('pt-BR')}).`,
        meta: { agendamentoId: atualizado.id },
        agendamentoId: atualizado.id,
      }).catch(() => {});
    }
  }

  // sincroniza com Google Calendar (se necessário)
  if (dataMudou || dados.status) {
    await sincronizarGoogleCalendarSegura('atualizar', agendamentoExistente.profissionalId, id).catch(() => {});
  }

  return atualizado;
}

export async function excluirAgendamento(id: number) {
  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    select: { profissionalId: true, id: true },
  });

  if (agendamento) {
    await sincronizarGoogleCalendarSegura('deletar', agendamento.profissionalId, agendamento.id).catch(() => {});
  }

  return prisma.agendamento.delete({ where: { id } });
}

export async function listarAgendamentosDoUsuario(usuarioId: number) {
  return prisma.agendamento.findMany({
    where: { pacienteId: usuarioId },
    orderBy: { data: 'asc' },
    include: {
      profissional: {
        include: {
          usuario: true,
          especialidade: true
        }
      }
    }
  });
}

export async function listarAgendamentosDoProfissional(profissionalId: number, data?: string) {
  const where: {
    profissionalId: number;
    data?: { gte: Date; lte: Date };
  } = { profissionalId };

  if (data) {
    const start = new Date(`${data}T00:00:00`);
    const end = new Date(`${data}T23:59:59`);
    where.data = { gte: start, lte: end };
  }

  return prisma.agendamento.findMany({
    where,
    include: {
      paciente: { 
        select: { 
          id: true,
          nome: true, 
          email: true,
          telefone: true
        } 
      },
      profissional: {
        include: {
          usuario: {
            select: {
              nome: true,
              email: true
            }
          },
          especialidade: true
        }
      }
    },
    orderBy: { data: 'asc' },
  });
}

export async function atualizarObservacoes(id: number, observacoes: string) {
  const agendamento = await prisma.agendamento.findUnique({ where: { id } });
  if (!agendamento) throw new Error('Agendamento não encontrado');

  return prisma.agendamento.update({
    where: { id },
    data: { observacoes: observacoes?.trim() || null }
  });
}

export async function listarHistoricoStatus(agendamentoId: number) {
  return prisma.historicoStatus.findMany({
    where: { agendamentoId },
    orderBy: { dataHora: 'asc' }
  });
}
