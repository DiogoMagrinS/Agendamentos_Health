import { Request, Response } from 'express';
import {
  listarUsuarios,
  buscarUsuarioPorId,
  criarUsuario,
  atualizarUsuario,
  excluirUsuario,
  atualizarPerfil,
  alterarSenha,
} from '../services/usuarioService';
import { RequestComUsuario } from '../types/RequestComUsuario';
import { prisma } from '../config/prisma';


export async function getUsuarios(req: Request, res: Response) {
  const usuarios = await listarUsuarios();
  res.json(usuarios);
}

export async function getUsuarioPorId(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  try {
    const usuario = await buscarUsuarioPorId(id);
    res.json(usuario);
  } catch (err) {
    res.status(404).json({ erro: 'Usuário não encontrado' });
  }
}

export async function postUsuario(req: Request, res: Response) {
  const novoUsuario = await criarUsuario(req.body);
  res.status(201).json(novoUsuario);
}

export async function putUsuario(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  try {
    const usuarioAtualizado = await atualizarUsuario(id, req.body);
    res.json(usuarioAtualizado);
  } catch {
    res.status(404).json({ erro: 'Usuário não encontrado' });
  }
}

export async function deleteUsuario(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  try {
    await excluirUsuario(id);
    res.status(204).send();
  } catch {
    res.status(404).json({ erro: 'Usuário não encontrado' });
  }
}


export async function atualizarPerfilUsuario(req: Request, res: Response) {
  try {
    if (!req.usuario?.id) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    const id = req.usuario.id;
    const { nome, email } = req.body;

    if (!nome && !email) {
      return res.status(400).json({ erro: 'Informe ao menos nome ou email para atualizar.' });
    }

    const usuarioAtualizado = await atualizarPerfil(id, { nome, email });
    res.json(usuarioAtualizado);
  } catch (error: any) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(400).json({ erro: error.message });
  }
}

export async function alterarSenhaUsuario(req: RequestComUsuario, res: Response) {
  try {
    const id = req.usuario.id;
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ erro: 'Preencha todos os campos.' });
    }

    await alterarSenha(id, senhaAtual, novaSenha);
    res.json({ mensagem: 'Senha alterada com sucesso!' });
  } catch (error: any) {
    res.status(400).json({ erro: error.message });
  }
}
