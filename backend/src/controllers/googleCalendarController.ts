import { Request, Response } from 'express';
import { generateAuthUrl, getToken, setCredentials, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../services/googleCalendarService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function authGoogleCalendar(req: Request, res: Response) {
  const usuario = (req as any).usuario;
  if (!usuario?.id) {
    return res.status(401).json({ erro: 'Usuário não autenticado.' });
  }

  try {
    // Busca o profissional associado ao usuário
    const profissional = await prisma.profissional.findUnique({
      where: { usuarioId: usuario.id },
    });

    if (!profissional) {
      return res.status(404).json({ erro: 'Profissional não encontrado para este usuário.' });
    }

    const authUrl = generateAuthUrl(profissional.id);
    res.json({ authUrl });
  } catch (error: any) {
    console.error('Erro ao gerar URL de autenticação:', error.message);
    res.status(500).json({ erro: `Erro ao gerar URL de autenticação: ${error.message}` });
  }
}

export async function googleCalendarCallback(req: Request, res: Response) {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).json({ erro: 'Código de autorização ou estado ausente.' });
  }

  const profissionalId = parseInt(state as string);
  if (isNaN(profissionalId)) {
    return res.status(400).json({ erro: 'ID de profissional inválido no estado.' });
  }

  try {
    const tokens = await getToken(code as string);

    const profissional = await prisma.profissional.findUnique({
      where: { id: profissionalId },
    });

    if (!profissional) {
      return res.status(404).json({ erro: 'Profissional não encontrado para o ID fornecido.' });
    }

    await setCredentials(profissional.id, tokens);

    // Redireciona para o frontend com mensagem de sucesso
    // Usa um redirect com hash para preservar a sessão
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/profissional?googleCalendar=success&redirect=true`);

  } catch (error: any) {
    console.error('Erro no callback do Google Calendar:', error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/profissional?googleCalendar=error&message=${encodeURIComponent(error.message)}`);
  }
}

export async function disconnectGoogleCalendar(req: Request, res: Response) {
  const usuario = (req as any).usuario;
  if (!usuario?.id) {
    return res.status(401).json({ erro: 'Usuário não autenticado.' });
  }

  try {
    const profissional = await prisma.profissional.findUnique({
      where: { usuarioId: usuario.id },
    });

    if (!profissional) {
      return res.status(404).json({ erro: 'Profissional não encontrado.' });
    }

    await prisma.profissional.update({
      where: { id: profissional.id },
      data: {
        // @ts-ignore - Campos do Google Calendar podem não existir ainda no banco
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleCalendarId: null,
      },
    });

    res.status(200).json({ mensagem: 'Desconexão do Google Calendar realizada com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao desconectar Google Calendar:', error.message);
    res.status(500).json({ erro: `Erro ao desconectar Google Calendar: ${error.message}` });
  }
}

export async function checkGoogleCalendarConnection(req: Request, res: Response) {
  const usuario = (req as any).usuario;
  if (!usuario?.id) {
    return res.status(401).json({ erro: 'Usuário não autenticado.' });
  }

  try {
    const profissional = await prisma.profissional.findUnique({
      where: { usuarioId: usuario.id },
    }) as any; // Campos do Google Calendar podem não existir ainda no banco

    const isConnected = !!(profissional?.googleAccessToken && profissional?.googleRefreshToken);
    res.status(200).json({ conectado: isConnected });

  } catch (error: any) {
    console.error('Erro ao verificar conexão com Google Calendar:', error.message);
    res.status(500).json({ erro: `Erro ao verificar conexão: ${error.message}` });
  }
}

