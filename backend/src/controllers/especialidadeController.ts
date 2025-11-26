import { Request, Response } from "express";
import { prisma } from "../config/prisma";

// ✅ Listar todas as especialidades
export const listarEspecialidades = async (req: Request, res: Response) => {
  try {
    const especialidades = await prisma.especialidade.findMany({
      orderBy: { nome: "asc" },
    });
    res.json(especialidades);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar especialidades." });
  }
};

// ✅ Criar uma nova especialidade
export const criarEspecialidade = async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ error: "O nome é obrigatório." });
    }

    // Verifica se já existe
    const existe = await prisma.especialidade.findUnique({
      where: { nome },
    });

    if (existe) {
      return res.status(400).json({ error: "Especialidade já existe." });
    }

    const especialidade = await prisma.especialidade.create({
      data: { nome },
    });

    res.status(201).json(especialidade);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar especialidade." });
  }
};

// ✅ Excluir especialidade
export const excluirEspecialidade = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    await prisma.especialidade.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir especialidade." });
  }
};
