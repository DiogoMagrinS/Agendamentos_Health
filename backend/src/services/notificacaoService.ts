import { PrismaClient, TipoUsuario } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export type CanalNotificacao = 'WHATSAPP';

interface Destinatario {
  idUsuario: number;
  tipoUsuario: TipoUsuario;
  nome: string;
  telefone?: string | null;
}

export interface DadosNotificacao {
  tipo: 'LEMBRETE' | 'CANCELAMENTO' | 'EDICAO' | 'POS_CONSULTA' | 'CONFIRMACAO_PRESENCA';
  canal: CanalNotificacao;
  destinatario: Destinatario;
  conteudo: string;
  meta?: Record<string, unknown>;
  agendamentoId?: number;
}

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_FROM = process.env.WHATSAPP_FROM;

function estaEmJanelaSilencio(): boolean {
  const hora = new Date().getHours();
  return hora >= 22 || hora < 7;
}

export async function enviarNotificacao(dados: DadosNotificacao) {
  if (estaEmJanelaSilencio()) {
    await registrarNotificacao({ ...dados, status: 'CRIADA', detalhesErro: 'Janela de silêncio' });
    return;
  }

  let status: 'CRIADA' | 'ENVIADA' | 'FALHOU' = 'CRIADA';
  let detalhesErro: string | null = null;

  try {
    if (dados.canal === 'WHATSAPP') {
      await enviarWhatsApp(dados.destinatario.telefone, dados.conteudo);
    }
    status = 'ENVIADA';
  } catch (err: any) {
    status = 'FALHOU';
    detalhesErro = err?.message ?? 'Erro ao enviar notificação';
  }

  await registrarNotificacao({ ...dados, status, detalhesErro });
}

async function enviarWhatsApp(telefone: string | null | undefined, mensagem: string) {
  if (!telefone) {
    throw new Error('Telefone do destinatário não informado');
  }

  if (!WHATSAPP_API_URL || !WHATSAPP_TOKEN || !WHATSAPP_FROM) {
    console.log('[WhatsApp MOCK]', { telefone, mensagem });
    return;
  }

  await axios.post(
    WHATSAPP_API_URL,
    {
      messaging_product: 'whatsapp',
      to: telefone,
      type: 'text',
      text: { body: mensagem },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

interface RegistroNotificacao extends DadosNotificacao {
  status: 'CRIADA' | 'ENVIADA' | 'FALHOU';
  detalhesErro?: string | null;
}

async function registrarNotificacao(registro: RegistroNotificacao) {
  await prisma.notificacao.create({
    data: {
      tipo: registro.tipo as any,
      canal: registro.canal as any,
      destinatarioId: registro.destinatario.idUsuario,
      destinatarioTipo: registro.destinatario.tipoUsuario,
      conteudo: registro.conteudo,
      meta: (registro.meta ?? {}) as any,
      status: registro.status as any,
      detalhesErro: registro.detalhesErro ?? null,
      agendamentoId: registro.agendamentoId,
    },
  });
}
