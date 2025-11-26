import { TipoUsuario } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        email: string;
        tipo: TipoUsuario;
      };
    }
  }
}

export {};