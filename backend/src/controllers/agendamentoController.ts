// src/controllers/agendamentoController.ts
// Correção: implementa os endpoints usando o service unificado; validações e mensagens claras
import { Request, Response } from 'express';
import {
  listarAgendamentos,
  buscarAgendamentoPorId,
  criarAgendamento,
  atualizarAgendamento,
  excluirAgendamento,
  listarAgendamentosDoUsuario,
  atualizarObservacoes,
  listarHistoricoStatus,
  listarAgendamentosDoProfissional
} from '../services/agendamentoService';
import { prisma } from '../config/prisma';

export async function getAgendamentos(_req: Request, res: Response) {
  try {
    const lista = await listarAgendamentos();
    return res.json(lista);
  } catch (err: any) {
    console.error('getAgendamentos:', err);
    return res.status(500).json({ erro: 'Erro ao listar agendamentos' });
  }
}

export async function getAgendamentoPorId(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  try {
    const item = await buscarAgendamentoPorId(id);
    return res.json(item);
  } catch (err: any) {
    console.error('getAgendamentoPorId:', err);
    return res.status(404).json({ erro: err.message || 'Agendamento não encontrado' });
  }
}

export async function postAgendamento(req: Request, res: Response) {
  try {
    const { pacienteId, profissionalId, data } = req.body;

    if (!pacienteId || !profissionalId || !data) {
      return res.status(400).json({ erro: 'Campos obrigatórios: pacienteId, profissionalId e data são necessários.' });
    }

    if (typeof pacienteId !== 'number' || typeof profissionalId !== 'number') {
      return res.status(400).json({ erro: 'pacienteId e profissionalId devem ser números.' });
    }

    const dataAgendamento = new Date(data);
    if (isNaN(dataAgendamento.getTime())) {
      return res.status(400).json({ erro: 'Data inválida. Use o formato ISO (ex: 2024-01-15T10:00:00.000Z).' });
    }

    const novo = await criarAgendamento({
      pacienteId,
      profissionalId,
      data: dataAgendamento,
      observacoes: req.body.observacoes
    });
    return res.status(201).json(novo);
  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error);
    return res.status(400).json({ erro: error.message || 'Erro ao criar agendamento.' });
  }
}

export async function putAgendamento(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  try {
    const atualizado = await atualizarAgendamento(id, req.body);
    return res.json(atualizado);
  } catch (error: any) {
    console.error('putAgendamento:', error);
    return res.status(400).json({ erro: error.message });
  }
}

export async function deleteAgendamento(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  try {
    await excluirAgendamento(id);
    return res.status(204).send();
  } catch (err: any) {
    console.error('deleteAgendamento:', err);
    return res.status(400).json({ erro: err.message || 'Erro ao deletar agendamento' });
  }
}

// Lista agendamentos do paciente autenticado
export async function listarAgendamentosUsuario(req: Request, res: Response) {
  try {
    const usuario = (req as any).usuario;
    if (!usuario) return res.status(401).json({ erro: 'Token inválido ou ausente.' });

    if (usuario.tipo !== 'PACIENTE') return res.status(403).json({ erro: 'Acesso permitido apenas para pacientes.' });

    const agendamentos = await listarAgendamentosDoUsuario(usuario.id);
    return res.json(agendamentos);
  } catch (error: any) {
    console.error('listarAgendamentosUsuario:', error);
    return res.status(400).json({ erro: error.message || 'Erro' });
  }
}

// Lista agendamentos do profissional autenticado (opcional query data=YYYY-MM-DD)
export async function listarAgendamentosProfissional(req: Request, res: Response) {
  try {
    const usuario = (req as any).usuario;
    console.log('[listarAgendamentosProfissional] Usuário:', usuario);
    
    if (!usuario) {
      console.error('[listarAgendamentosProfissional] Usuário não autenticado');
      return res.status(401).json({ erro: 'Token inválido ou ausente.' });
    }

    if (usuario.tipo !== 'PROFISSIONAL') {
      console.error('[listarAgendamentosProfissional] Tipo de usuário inválido:', usuario.tipo);
      return res.status(403).json({ erro: 'Acesso permitido apenas para profissionais.' });
    }

    console.log('[listarAgendamentosProfissional] Buscando profissional para usuarioId:', usuario.id);
    const profissional = await prisma.profissional.findUnique({ where: { usuarioId: usuario.id } });
    
    if (!profissional) {
      console.error('[listarAgendamentosProfissional] Profissional não encontrado para usuarioId:', usuario.id);
      return res.status(404).json({ erro: 'Profissional não encontrado.' });
    }

    console.log('[listarAgendamentosProfissional] Profissional encontrado:', profissional.id);
    const { data } = req.query;
    console.log('[listarAgendamentosProfissional] Query data:', data);
    
    const agendamentos = await listarAgendamentosDoProfissional(profissional.id, data as string | undefined);
    console.log('[listarAgendamentosProfissional] Agendamentos encontrados:', agendamentos.length);
    
    return res.json(agendamentos);
  } catch (error: any) {
    console.error('[listarAgendamentosProfissional] Erro:', error);
    console.error('[listarAgendamentosProfissional] Stack:', error.stack);
    return res.status(500).json({ erro: error.message || 'Erro ao listar agendamentos do profissional' });
  }
}

export async function editarObservacoes(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { observacoes } = req.body;

    if (observacoes !== undefined && typeof observacoes !== 'string') {
      return res.status(400).json({ erro: 'Observações devem ser uma string.' });
    }

    const atualizado = await atualizarObservacoes(id, observacoes || '');
    return res.json(atualizado);
  } catch (error: any) {
    console.error('editarObservacoes:', error);
    return res.status(400).json({ erro: error.message || 'Erro' });
  }
}

export async function getHistoricoStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  try {
    const historico = await listarHistoricoStatus(id);
    return res.json(historico);
  } catch (error: any) {
    console.error('getHistoricoStatus:', error);
    return res.status(400).json({ erro: error.message || 'Erro' });
  }
}

// Atualizar status do agendamento (com envio de notificações)
export async function atualizarStatus(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!['CONFIRMADO', 'CANCELADO', 'FINALIZADO'].includes(status)) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }

    // buscar antes para compor notificações
    const agendamentoAntes = await prisma.agendamento.findUnique({
      where: { id },
      include: {
        paciente: true,
        profissional: {
          include: { usuario: true }
        }
      }
    });

    if (!agendamentoAntes) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

    // atualiza status
    const atualizado = await prisma.agendamento.update({
      where: { id },
      data: { status },
      include: {
        paciente: true,
        profissional: {
          include: { usuario: true }
        }
      }
    });

    // importar notificacaoService dinamicamente (pode não existir)
    try {
      const { enviarNotificacao } = await import('../services/notificacaoService');
      if (status === 'FINALIZADO' && atualizado.paciente?.telefone) {
        await enviarNotificacao({
          tipo: 'POS_CONSULTA',
          canal: 'WHATSAPP',
          destinatario: {
            idUsuario: atualizado.pacienteId,
            tipoUsuario: atualizado.paciente.tipo,
            nome: atualizado.paciente.nome,
            telefone: atualizado.paciente.telefone,
          },
          conteudo: '',
          meta: {
            profissional: atualizado.profissional.usuario.nome,
            observacoes: atualizado.observacoes,
          },
          agendamentoId: atualizado.id,
        });
      } else if (status === 'CONFIRMADO' && atualizado.paciente?.telefone) {
        await enviarNotificacao({
          tipo: 'CONFIRMACAO_PRESENCA',
          canal: 'WHATSAPP',
          destinatario: {
            idUsuario: atualizado.pacienteId,
            tipoUsuario: atualizado.paciente.tipo,
            nome: atualizado.paciente.nome,
            telefone: atualizado.paciente.telefone,
          },
          conteudo: '',
          meta: {
            data: new Date(atualizado.data).toLocaleString('pt-BR'),
            profissional: atualizado.profissional.usuario.nome,
          },
          agendamentoId: atualizado.id,
        });
      }
    } catch (e) {
      console.warn('notificacaoService não disponível ou falhou (não crítico):', e);
    }

    // sincroniza com google calendar (não crítico)
    try {
      const googleMod = await import('../services/googleCalendarService');
      if (googleMod && googleMod.updateCalendarEvent) {
        await googleMod.updateCalendarEvent(agendamentoAntes.profissionalId, id);
      }
    } catch (e) {
      console.warn('googleCalendarService não disponível ou falhou (não crítico):', e);
    }

    return res.json(atualizado);
  } catch (error: any) {
    console.error('atualizarStatus:', error);
    return res.status(400).json({ erro: error.message || 'Erro ao atualizar status' });
  }
}
