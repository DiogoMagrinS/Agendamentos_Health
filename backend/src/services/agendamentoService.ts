import { PrismaClient, StatusAgendamento } from '@prisma/client';

// Função auxiliar para enviar notificação (opcional - não bloqueia o fluxo)
async function enviarNotificacaoSegura(dados: any) {
  try {
    // @ts-ignore - Import dinâmico pode não ser resolvido em tempo de compilação
    const notificacaoModule = await import('./notificacaoService');
    if (notificacaoModule && notificacaoModule.enviarNotificacao) {
      await notificacaoModule.enviarNotificacao(dados);
    }
  } catch (error) {
    // Se o serviço de notificação não existir ou falhar, apenas loga o erro
    // mas não interrompe a criação do agendamento
    console.warn('Erro ao enviar notificação (não crítico):', error);
  }
}

// Função auxiliar para sincronizar com Google Calendar (opcional - não bloqueia o fluxo)
async function sincronizarGoogleCalendarSegura(
  acao: 'criar' | 'atualizar' | 'deletar',
  profissionalId: number,
  agendamentoId: number
) {
  try {
    console.log(`[Google Calendar] Tentando ${acao} evento para agendamento ${agendamentoId}, profissional ${profissionalId}`);
    
    // Importa o módulo dinamicamente para evitar que a ausência de variáveis de ambiente quebre o app
    const googleCalendarModule = await import('./googleCalendarService');
    if (googleCalendarModule) {
      switch (acao) {
        case 'criar':
          await googleCalendarModule.createCalendarEvent(profissionalId, agendamentoId);
          console.log(`[Google Calendar] ✅ Evento criado com sucesso para agendamento ${agendamentoId}`);
          break;
        case 'atualizar':
          await googleCalendarModule.updateCalendarEvent(profissionalId, agendamentoId);
          console.log(`[Google Calendar] ✅ Evento atualizado com sucesso para agendamento ${agendamentoId}`);
          break;
        case 'deletar':
          await googleCalendarModule.deleteCalendarEvent(profissionalId, agendamentoId);
          console.log(`[Google Calendar] ✅ Evento deletado com sucesso para agendamento ${agendamentoId}`);
          break;
      }
    } else {
      console.warn(`[Google Calendar] ⚠️ Módulo não encontrado`);
    }
  } catch (error: any) {
    // Se o serviço do Google Calendar não existir ou falhar, apenas loga o erro
    // mas não interrompe a operação do agendamento
    console.error(`[Google Calendar] ❌ Erro ao sincronizar (${acao}) para agendamento ${agendamentoId}:`, error.message || error);
    if (error.stack) {
      console.error(`[Google Calendar] Stack trace:`, error.stack);
    }
  }
}

const prisma = new PrismaClient();

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
    }
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
  if (!agendamento) throw new Error();
  return agendamento;
}

export async function criarAgendamento(data: {
  pacienteId: number;
  profissionalId: number;
  data: Date;
  observacoes?: string;
}) {
  // Verifica se o paciente existe
  const paciente = await prisma.usuario.findUnique({
    where: { id: data.pacienteId }
  });

  if (!paciente) {
    throw new Error('Paciente não encontrado');
  }

  if (paciente.tipo !== 'PACIENTE') {
    throw new Error('Usuário não é um paciente');
  }

  const profissional = await prisma.profissional.findUnique({
    where: { id: data.profissionalId }
  });

  if (!profissional) {
    throw new Error('Profissional não encontrado');
  }

  const dataAgendamento = new Date(data.data);

  if (isNaN(dataAgendamento.getTime())) {
    throw new Error('Data inválida');
  }

  if (dataAgendamento <= new Date()) {
    throw new Error('Data deve ser futura');
  }

  const conflito = await prisma.agendamento.findFirst({
    where: {
      profissionalId: data.profissionalId,
      data: dataAgendamento
    }
  });

  if (conflito) throw new Error('Horário já agendado');

  const agendamento = await prisma.agendamento.create({
    data: {
      pacienteId: data.pacienteId,
      profissionalId: data.profissionalId,
      data: dataAgendamento,
      observacoes: data.observacoes
    }
  });

  // paciente já foi buscado anteriormente, não precisa buscar novamente
  const profissionalUsuario = await prisma.profissional.findUnique({
    where: { id: data.profissionalId },
    include: { usuario: true },
  });

  if (paciente && profissionalUsuario?.usuario) {
    await enviarNotificacaoSegura({
      tipo: 'EDICAO',
      canal: 'WHATSAPP',
      destinatario: {
        idUsuario: paciente.id,
        tipoUsuario: paciente.tipo,
        nome: paciente.nome,
        telefone: paciente.telefone,
      },
      conteudo: '',
      meta: {
        data: dataAgendamento.toLocaleString('pt-BR'),
        profissional: profissionalUsuario.usuario.nome,
      },
      agendamentoId: agendamento.id,
    });
  }

  if (profissionalUsuario?.usuario && paciente) {
    await enviarNotificacaoSegura({
      tipo: 'EDICAO',
      canal: 'WHATSAPP',
      destinatario: {
        idUsuario: profissionalUsuario.usuario.id,
        tipoUsuario: profissionalUsuario.usuario.tipo,
        nome: profissionalUsuario.usuario.nome,
        telefone: profissionalUsuario.usuario.telefone,
      },
      conteudo: '',
      meta: {
        data: dataAgendamento.toLocaleString('pt-BR'),
        paciente: paciente.nome,
        tipo: 'NOVO_AGENDAMENTO',
      },
      agendamentoId: agendamento.id,
    });
  }

  // Sincroniza com Google Calendar se o profissional tiver conectado
  await sincronizarGoogleCalendarSegura('criar', data.profissionalId, agendamento.id);

  return agendamento;
}

export async function atualizarAgendamento(
  id: number,
  dados: Partial<{
    pacienteId: number;
    profissionalId: number;
    data: Date;
    status: string;
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

  if (dataAtualizada && dataAtualizada <= new Date()) {
    throw new Error('A data do agendamento deve estar no futuro');
  }

  if (dados.profissionalId && dataAtualizada) {
    const conflito = await prisma.agendamento.findFirst({
      where: {
        profissionalId: dados.profissionalId,
        data: dataAtualizada,
        NOT: { id }
      }
    });

    if (conflito) {
      throw new Error('Este horário já está ocupado para o profissional');
    }
  }

  // Verifica se o status mudou
  const statusAlterado = dados.status && dados.status !== agendamentoExistente.status;

  // Atualiza o agendamento
  const dataAnterior = agendamentoExistente.data;

  const atualizado = await prisma.agendamento.update({
    where: { id },
    data: {
      pacienteId: dados.pacienteId,
      profissionalId: dados.profissionalId,
      data: dataAtualizada,
      status: dados.status as any
    }
  });

  // Se o status foi alterado, registra no histórico
  if (statusAlterado) {
    await prisma.historicoStatus.create({
      data: {
        agendamentoId: id,
        status: dados.status as any
      }
    });
  }

  const paciente = agendamentoExistente.paciente;
  const profissionalUsuario = agendamentoExistente.profissional.usuario;

  const dataMudou =
    dataAtualizada && dataAtualizada.getTime() !== new Date(dataAnterior).getTime();

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
          telefone: paciente.telefone,
        },
        conteudo: `Seu agendamento foi atualizado. ${resumo}`,
        meta: { agendamentoId: atualizado.id },
        agendamentoId: atualizado.id,
      });
    }

    if (profissionalUsuario) {
      await enviarNotificacaoSegura({
        tipo: 'EDICAO',
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
      });
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
      });
    }
  }

  // Sincroniza com Google Calendar se o evento existir
  if (dataMudou || dados.status) {
    await sincronizarGoogleCalendarSegura('atualizar', agendamentoExistente.profissionalId, id);
  }

  return atualizado;
}

export async function excluirAgendamento(id: number) {
  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    select: { profissionalId: true, id: true },
  });

  if (agendamento) {
    await sincronizarGoogleCalendarSegura('deletar', agendamento.profissionalId, agendamento.id);
  }

  return prisma.agendamento.delete({
    where: { id }
  });
}

export async function listarAgendamentosDoUsuario(usuarioId: number) {
  return prisma.agendamento.findMany({
    where: { pacienteId: usuarioId },
    orderBy: { data: 'asc' },
    include: {
      profissional: {
        include: {
          usuario: true,          // ✅ pega todos os dados do usuário
          especialidade: true     // ✅ pega a especialidade correta vinculada ao profissional
        }
      }
    }
  });
}

export async function listarAgendamentosDoProfissional(profissionalId: number, data?: string) {
  const where: any = { profissionalId };

  if (data) {
    const start = new Date(`${data}T00:00:00`);
    const end = new Date(`${data}T23:59:59`);
    where.data = { gte: start, lte: end };
  }

  return prisma.agendamento.findMany({
    where,
    include: {
      paciente: { select: { nome: true, email: true } },
    },
    orderBy: { data: 'asc' },
  });
}

export async function atualizarObservacoes(id: number, observacoes: string) {
  const agendamento = await prisma.agendamento.findUnique({ where: { id } });
  if (!agendamento) throw new Error('Agendamento não encontrado');

  return prisma.agendamento.update({
    where: { id },
    data: { observacoes: observacoes.trim() || null }
  });
}

export async function listarHistoricoStatus(agendamentoId: number) {
  return prisma.historicoStatus.findMany({
    where: { agendamentoId },
    orderBy: { dataHora: 'asc' }
  });
}
