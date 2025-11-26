import bcrypt from 'bcryptjs';
import { TipoUsuario } from '@prisma/client';
import { prisma } from '../config/prisma';
import { validarEmail, validarSenha, validarNome, sanitizarString } from '../utils/validators';

export async function listarUsuarios() {
  return prisma.usuario.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      tipo: true,
      criadoEm: true,
      telefone: true,
      // Não retorna a senha
    },
  });
}

export async function buscarUsuarioPorId(id: number) {
  const usuario = await prisma.usuario.findUnique({ 
    where: { id },
    select: {
      id: true,
      nome: true,
      email: true,
      tipo: true,
      criadoEm: true,
      telefone: true,
    },
  });
  if (!usuario) throw new Error('Usuário não encontrado');
  return usuario;
}

export async function criarUsuario(dados: {
  nome: string;
  email: string;
  senha: string;
  tipo: string;
}) {
  // Validações
  const nomeValido = validarNome(dados.nome);
  if (!nomeValido.valida) throw new Error(nomeValido.erro);

  if (!validarEmail(dados.email)) {
    throw new Error('Email inválido');
  }

  const senhaValida = validarSenha(dados.senha);
  if (!senhaValida.valida) throw new Error(senhaValida.erro);

  // Verifica se email já existe
  const emailExistente = await prisma.usuario.findUnique({
    where: { email: dados.email.toLowerCase().trim() },
  });
  if (emailExistente) {
    throw new Error('Email já cadastrado');
  }

  // Sanitiza e normaliza
  const nomeSanitizado = sanitizarString(dados.nome);
  const emailNormalizado = dados.email.toLowerCase().trim();
  const senhaHash = await bcrypt.hash(dados.senha, 10);

  return prisma.usuario.create({
    data: {
      nome: nomeSanitizado,
      email: emailNormalizado,
      senha: senhaHash,
      tipo: dados.tipo as TipoUsuario
    },
    select: {
      id: true,
      nome: true,
      email: true,
      tipo: true,
      criadoEm: true,
    },
  });
}

export async function atualizarUsuario(
  id: number,
  dados: Partial<{ nome: string; email: string; senha: string; tipo: string }>
) {
  const camposAtualizaveis: Record<string, unknown> = {};

  if (dados.nome) {
    const nomeValido = validarNome(dados.nome);
    if (!nomeValido.valida) throw new Error(nomeValido.erro);
    camposAtualizaveis.nome = sanitizarString(dados.nome);
  }

  if (dados.email) {
    if (!validarEmail(dados.email)) {
      throw new Error('Email inválido');
    }
    const emailNormalizado = dados.email.toLowerCase().trim();
    // Verifica se email já existe em outro usuário
    const emailExistente = await prisma.usuario.findFirst({
      where: { 
        email: emailNormalizado,
        id: { not: id }
      },
    });
    if (emailExistente) {
      throw new Error('Email já cadastrado para outro usuário');
    }
    camposAtualizaveis.email = emailNormalizado;
  }

  if (dados.tipo) {
    camposAtualizaveis.tipo = dados.tipo as TipoUsuario;
  }

  if (dados.senha) {
    const senhaValida = validarSenha(dados.senha);
    if (!senhaValida.valida) throw new Error(senhaValida.erro);
    camposAtualizaveis.senha = await bcrypt.hash(dados.senha, 10);
  }

  return prisma.usuario.update({
    where: { id },
    data: camposAtualizaveis,
    select: {
      id: true,
      nome: true,
      email: true,
      tipo: true,
      criadoEm: true,
    },
  });
}
export async function excluirUsuario(id: number) {
  return prisma.usuario.delete({
    where: { id },
  });
}

export async function atualizarPerfil(id: number, dados: { nome?: string, email?: string }) {
  return prisma.usuario.update({
    where: { id },
    data: dados,
    select: {
      id: true,
      nome: true,
      email: true,
      tipo: true,
    },
  });
}

export async function alterarSenha(id: number, senhaAtual: string, novaSenha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new Error('Usuário não encontrado.');

  const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
  if (!senhaCorreta) throw new Error('Senha atual incorreta.');

  const senhaValida = validarSenha(novaSenha);
  if (!senhaValida.valida) throw new Error(senhaValida.erro);

  const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

  await prisma.usuario.update({
    where: { id },
    data: { senha: novaSenhaHash }
  });
}
