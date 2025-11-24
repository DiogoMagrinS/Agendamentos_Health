import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY;

// Normaliza a chave de criptografia para ter exatamente 32 bytes
let ENCRYPTION_KEY: Buffer | null = null;
if (ENCRYPTION_KEY_RAW) {
  if (ENCRYPTION_KEY_RAW.length === 32) {
    ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_RAW, 'utf8');
  } else if (ENCRYPTION_KEY_RAW.length > 32) {
    // Se for maior, pega os primeiros 32 caracteres
    ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_RAW.substring(0, 32), 'utf8');
  } else {
    // Se for menor, preenche com zeros ou usa hash
    const hash = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();
    ENCRYPTION_KEY = hash.slice(0, 32);
  }
}

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.warn('Variáveis de ambiente GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ou GOOGLE_REDIRECT_URI não configuradas. A integração com o Google Calendar não funcionará.');
}

if (!ENCRYPTION_KEY) {
  console.warn('Variável de ambiente ENCRYPTION_KEY não configurada. Tokens do Google Calendar não serão criptografados.');
}

const SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'];

// Função para criptografar dados
function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text; // Retorna texto puro se a chave não estiver configurada
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error: any) {
    console.error('Erro ao criptografar:', error.message);
    return text; // Retorna texto puro em caso de erro
  }
}

// Função para descriptografar dados
function decrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text; // Retorna texto puro se a chave não estiver configurada
  const textParts = text.split(':');
  if (textParts.length !== 2) {
    // Se não tem o formato esperado, assume que não está criptografado
    return text;
  }
  try {
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = textParts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error: any) {
    console.warn('Erro ao descriptografar, usando texto puro:', error.message);
    return text; // Retorna o texto original se falhar
  }
}

function getOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Configurações do Google Calendar não encontradas.');
  }
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

export function generateAuthUrl(profissionalId: number): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: profissionalId.toString(), // Passa o ID do profissional para o callback
  });
}

export async function getToken(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function setCredentials(profissionalId: number, tokens: any) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  await prisma.profissional.update({
    where: { id: profissionalId },
    data: {
      googleAccessToken: tokens.access_token ? encrypt(tokens.access_token) : null,
      googleRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });
}

async function getAuthenticatedClient(profissionalId: number) {
  console.log(`[Google Calendar] Buscando profissional ${profissionalId} para autenticação`);
  const profissional = await prisma.profissional.findUnique({
    where: { id: profissionalId },
    include: { usuario: true },
  });

  if (!profissional) {
    console.error(`[Google Calendar] ❌ Profissional ${profissionalId} não encontrado`);
    throw new Error('Profissional não encontrado.');
  }

  if (!profissional.googleRefreshToken) {
    console.error(`[Google Calendar] ❌ Profissional ${profissional.usuario.nome} (ID: ${profissionalId}) não tem refreshToken`);
    throw new Error('Profissional não autenticado com o Google Calendar.');
  }

  console.log(`[Google Calendar] Profissional encontrado: ${profissional.usuario.nome}, preparando OAuth2 client`);
  const oauth2Client = getOAuth2Client();
  
  const accessToken = profissional.googleAccessToken ? decrypt(profissional.googleAccessToken) : undefined;
  const refreshToken = profissional.googleRefreshToken ? decrypt(profissional.googleRefreshToken) : undefined;
  
  console.log(`[Google Calendar] Tokens: accessToken=${!!accessToken}, refreshToken=${!!refreshToken}, expiry=${profissional.googleTokenExpiry?.toISOString()}`);
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: profissional.googleTokenExpiry?.getTime(),
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token && tokens.expiry_date) {
      await prisma.profissional.update({
        where: { id: profissionalId },
        data: {
          googleAccessToken: encrypt(tokens.access_token),
          googleTokenExpiry: new Date(tokens.expiry_date),
        },
      });
    }
    if (tokens.refresh_token) {
      await prisma.profissional.update({
        where: { id: profissionalId },
        data: {
          googleRefreshToken: encrypt(tokens.refresh_token),
        },
      });
    }
  });

  return oauth2Client;
}

export async function createCalendarEvent(profissionalId: number, agendamentoId: number) {
  console.log(`[Google Calendar] Iniciando criação de evento para agendamento ${agendamentoId}, profissional ${profissionalId}`);
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    console.warn('[Google Calendar] ⚠️ Configurações do Google Calendar ausentes. Evento não será criado.');
    return;
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      paciente: true,
      profissional: {
        include: { usuario: true, especialidade: true },
      },
    },
  });

  if (!agendamento) {
    console.error(`[Google Calendar] ❌ Agendamento ${agendamentoId} não encontrado.`);
    throw new Error('Agendamento não encontrado.');
  }

  const { paciente, data, observacoes } = agendamento;
  const profissional = agendamento.profissional;

  console.log(`[Google Calendar] Profissional: ${profissional.usuario.nome}, tem refreshToken: ${!!profissional.googleRefreshToken}`);

  if (!profissional.googleRefreshToken) {
    console.warn(`[Google Calendar] ⚠️ Profissional ${profissional.usuario.nome} (ID: ${profissionalId}) não conectado ao Google Calendar. Evento não será criado.`);
    return;
  }

  try {
    console.log(`[Google Calendar] Obtendo cliente autenticado para profissional ${profissional.id}`);
    const auth = await getAuthenticatedClient(profissional.id);
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: `Consulta com ${paciente.nome} (${profissional.especialidade.nome})`,
      description: `Paciente: ${paciente.nome}\nEmail: ${paciente.email}\nTelefone: ${paciente.telefone || 'N/A'}\nObservações: ${observacoes || 'N/A'}`,
      start: {
        dateTime: data.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(data.getTime() + 60 * 60 * 1000).toISOString(), // Duração de 1 hora
        timeZone: 'America/Sao_Paulo',
      },
      attendees: [
        { email: paciente.email },
        { email: profissional.usuario.email },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    console.log(`[Google Calendar] Criando evento no Google Calendar para ${paciente.nome} em ${data.toISOString()}`);
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    if (res.data.id) {
      await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { googleEventId: res.data.id },
      });
      console.log(`[Google Calendar] ✅ Evento criado com sucesso! ID: ${res.data.id}, Link: ${res.data.htmlLink}`);
    } else {
      console.warn(`[Google Calendar] ⚠️ Evento criado mas sem ID retornado`);
    }
  } catch (error: any) {
    console.error(`[Google Calendar] ❌ Erro ao criar evento para agendamento ${agendamentoId}:`, error.message);
    if (error.response) {
      console.error(`[Google Calendar] Resposta do erro:`, JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) {
      console.error(`[Google Calendar] Stack trace:`, error.stack);
    }
    throw new Error(`Erro ao criar evento no Google Calendar: ${error.message}`);
  }
}

export async function updateCalendarEvent(profissionalId: number, agendamentoId: number) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    console.warn('Configurações do Google Calendar ausentes. Evento não será atualizado.');
    return;
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      paciente: true,
      profissional: {
        include: { usuario: true, especialidade: true },
      },
    },
  });

  if (!agendamento || !agendamento.googleEventId) {
    console.warn(`Agendamento ${agendamentoId} não encontrado ou não possui evento no Google Calendar para atualizar.`);
    return;
  }

  const { paciente, data, observacoes } = agendamento;
  const profissional = agendamento.profissional;

  if (!profissional.googleRefreshToken) {
    console.warn(`Profissional ${profissional.usuario.nome} não conectado ao Google Calendar. Evento não será atualizado.`);
    return;
  }

  try {
    const auth = await getAuthenticatedClient(profissional.id);
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: `Consulta com ${paciente.nome} (${profissional.especialidade.nome})`,
      description: `Paciente: ${paciente.nome}\nEmail: ${paciente.email}\nTelefone: ${paciente.telefone || 'N/A'}\nObservações: ${observacoes || 'N/A'}`,
      start: {
        dateTime: data.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(data.getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      attendees: [
        { email: paciente.email },
        { email: profissional.usuario.email },
      ],
    };

    await calendar.events.update({
      calendarId: 'primary',
      eventId: agendamento.googleEventId,
      requestBody: event,
    });
    console.log(`Evento do Google Calendar atualizado para agendamento ${agendamentoId}`);
  } catch (error: any) {
    console.error(`Erro ao atualizar evento no Google Calendar para agendamento ${agendamentoId}:`, error.message);
    throw new Error(`Erro ao atualizar evento no Google Calendar: ${error.message}`);
  }
}

export async function deleteCalendarEvent(profissionalId: number, agendamentoId: number) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    console.warn('Configurações do Google Calendar ausentes. Evento não será deletado.');
    return;
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      profissional: {
        include: { usuario: true },
      },
    },
  });

  if (!agendamento || !agendamento.googleEventId) {
    console.warn(`Agendamento ${agendamentoId} não encontrado ou não possui evento no Google Calendar para deletar.`);
    return;
  }

  const profissional = agendamento.profissional;

  if (!profissional.googleRefreshToken) {
    console.warn(`Profissional ${profissional.usuario.nome} não conectado ao Google Calendar. Evento não será deletado.`);
    return;
  }

  try {
    const auth = await getAuthenticatedClient(profissional.id);
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: agendamento.googleEventId,
    });
    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { googleEventId: null },
    });
    console.log(`Evento do Google Calendar deletado para agendamento ${agendamentoId}`);
  } catch (error: any) {
    console.error(`Erro ao deletar evento no Google Calendar para agendamento ${agendamentoId}:`, error.message);
    throw new Error(`Erro ao deletar evento no Google Calendar: ${error.message}`);
  }
}

