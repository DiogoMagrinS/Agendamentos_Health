import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
const JWT_SECRET = process.env.JWT_SECRET || 'minha_chave_secreta';

export async function autenticarUsuario(email: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario) throw new Error('Usuário não encontrado');

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

  if (!senhaCorreta) throw new Error('Senha incorreta');

  const token = jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  return { token, usuario: { id: usuario.id, nome: usuario.nome, tipo: usuario.tipo } };
}
