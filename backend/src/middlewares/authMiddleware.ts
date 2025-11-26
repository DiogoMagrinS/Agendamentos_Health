// src/middlewares/authMiddleware.ts
// Correção: validação robusta do token JWT, tratamento de erro detalhado
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'minha_chave_secreta_aqui';

interface JwtPayload {
  id: number;
  email: string;
  tipo: string;
}

export function autenticarToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && (authHeader as string).startsWith('Bearer ')
      ? (authHeader as string).split(' ')[1]
      : undefined;

    if (!token) return res.status(401).json({ erro: 'Token não fornecido' });

    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (!payload || !payload.id) return res.status(403).json({ erro: 'Token inválido' });

    // Anexa o payload como "usuario" usando a declaração de tipos do Express
    req.usuario = {
      id: payload.id,
      email: payload.email,
      tipo: payload.tipo as 'PACIENTE' | 'PROFISSIONAL' | 'RECEPCIONISTA',
    };
    next();
  } catch (err: any) {
    console.error('autenticarToken error:', err);
    return res.status(403).json({ erro: 'Token inválido ou expirado' });
  }
}
