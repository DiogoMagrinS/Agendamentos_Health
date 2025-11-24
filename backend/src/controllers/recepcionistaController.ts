import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import bcrypt from "bcryptjs";

// ====================
// 🧩 PACIENTES / USUÁRIOS
// ====================

// Listar todos os usuários (pacientes, profissionais e recepcionistas)
export const criarUsuario = async (req: Request, res: Response) => {
  try {
    const {
      nome,
      email,
      senha,
      tipo,
      especialidadeId,
      diasAtendimento,
      horaInicio,
      horaFim,
      formacao,
      biografia,
      fotoPerfil,
    } = req.body;

    // validações básicas
    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({ erro: "Campos obrigatórios faltando." });
    }

    // criptografa a senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // cria o usuário principal
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        tipo,
      },
    });

    // guarda o id para associar ao profissional, se necessário
    const usuarioId = novoUsuario.id;

    // se for profissional, cria também o registro na tabela Profissional
    if (tipo === "PROFISSIONAL") {
      if (!especialidadeId || !horaInicio || !horaFim || !diasAtendimento?.length) {
        return res
          .status(400)
          .json({ erro: "Profissional requer especialidade, horário e dias de atendimento." });
      }

      await prisma.profissional.create({
        data: {
          usuarioId,
          especialidadeId: Number(especialidadeId),
          diasAtendimento,
          horaInicio,
          horaFim,
          formacao,
          biografia,
          fotoPerfil,
        },
      });
    }

    return res.status(201).json({ mensagem: "Usuário criado com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return res.status(500).json({ erro: "Erro interno ao criar usuário." });
  }
};
// Atualizar usuário
export const atualizarUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, email, tipo } = req.body;

    const atualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data: { nome, email, tipo },
    });

    res.json(atualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar usuário." });
  }
};

// Excluir usuário
export const deletarUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.usuario.delete({ where: { id: Number(id) } });
    res.json({ message: "Usuário excluído com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao excluir usuário." });
  }
};

// ====================
// 🧩 AGENDAMENTOS
// ====================

// Listar todos os agendamentos (com nomes de paciente e profissional)
export const listarAgendamentos = async (req: Request, res: Response) => {
  try {
    const agendamentos = await prisma.agendamento.findMany({
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            tipo: true,
          }
        },
        profissional: { 
          include: { 
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                tipo: true,
              }
            },
            especialidade: {
              select: {
                id: true,
                nome: true,
              }
            }
          } 
        },
      },
      orderBy: { data: "asc" },
    });
    res.json(agendamentos);
  } catch (error: any) {
    console.error("Erro ao listar agendamentos:", error);
    res.status(500).json({ 
      error: "Erro ao listar agendamentos.",
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Atualizar status de um agendamento
export const atualizarAgendamento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const agendamento = await prisma.agendamento.update({
      where: { id: Number(id) },
      data: { status },
    });

    res.json(agendamento);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar agendamento." });
  }
};

// =======================
// 🧠 ESPECIALIDADES
// =======================

// Listar todas as especialidades
export const listarEspecialidades = async (req: Request, res: Response) => {
  try {
    const especialidades = await prisma.especialidade.findMany({
      orderBy: { nome: "asc" },
    });
    return res.json(especialidades);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar especialidades" });
  }
};

// Criar nova especialidade
export const criarEspecialidade = async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "O nome da especialidade é obrigatório." });
    }

    const jaExiste = await prisma.especialidade.findUnique({ where: { nome } });
    if (jaExiste) {
      return res.status(400).json({ error: "Esta especialidade já existe." });
    }

    const nova = await prisma.especialidade.create({ data: { nome } });
    return res.status(201).json(nova);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar especialidade" });
  }
};

// Excluir especialidade
export const excluirEspecialidade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existe = await prisma.especialidade.findUnique({ where: { id: Number(id) } });
    if (!existe) {
      return res.status(404).json({ error: "Especialidade não encontrada." });
    }

    await prisma.especialidade.delete({ where: { id: Number(id) } });
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir especialidade" });
  }
};

export const listarUsuarios = async (req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        criadoEm: true,
        profissional: {
          include: {
            especialidade: {
              select: {
                id: true,
                nome: true,
              }
            }
          }
        }
      },
      orderBy: { id: "asc" },
    });

    return res.json(usuarios);
  } catch (error: any) {
    console.error("Erro ao listar usuários:", error);
    return res.status(500).json({ 
      erro: "Erro interno ao listar usuários.",
      detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
export const dashboardResumo = async (req: Request, res: Response) => {
  try {
    const [totalUsuarios, totalPacientes, totalProfissionais, totalAgendamentosHoje, canceladosMes] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuario.count({ where: { tipo: "PACIENTE" } }),
      prisma.usuario.count({ where: { tipo: "PROFISSIONAL" } }),
      prisma.agendamento.count({
        where: {
          data: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.agendamento.count({
        where: {
          status: "CANCELADO",
          data: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    res.json({ totalUsuarios, totalPacientes, totalProfissionais, totalAgendamentosHoje, canceladosMes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao carregar resumo" });
  }
};