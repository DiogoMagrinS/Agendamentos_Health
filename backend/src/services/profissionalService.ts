// src/services/profissionalService.ts
// Correção: implementa todas as funções exportadas usadas pelo controller
import { prisma } from '../config/prisma';
import { DiaSemana } from '@prisma/client';

type CriarProfissionalData = {
  usuarioId: number;
  especialidadeId: number;
  diasAtendimento: string[]; // strings que correspondem ao enum DiaSemana
  horaInicio: string; // "08:00"
  horaFim: string;    // "17:00"
  biografia?: string;
  formacao?: string;
  fotoPerfil?: string | null;
};

export async function listarProfissionais(especialidadeId?: number) {
  try {
    return await prisma.profissional.findMany({
      where: especialidadeId ? { especialidadeId } : undefined,
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
    });
  } catch (error) {
    console.error("Erro ao listar profissionais:", error);
    throw new Error('Erro ao listar profissionais');
  }
}

export async function buscarProfissionalPorId(id: number) {
  const profissional = await prisma.profissional.findUnique({
    where: { id },
    include: { usuario: true, especialidade: true },
  });
  if (!profissional) throw new Error('Profissional não encontrado');
  return profissional;
}

function validarEDocumentarDias(dias: string[]): DiaSemana[] {
  if (!Array.isArray(dias)) throw new Error('diasAtendimento deve ser um array');
  const convertidos: DiaSemana[] = dias.map((d) => {
    // valida se valor está no enum DiaSemana
    const valores = Object.values(DiaSemana);
    if (!valores.includes(d as DiaSemana)) {
      throw new Error(`Dia inválido: ${d}`);
    }
    return d as DiaSemana;
  });
  return convertidos;
}

export async function criarProfissional(data: CriarProfissionalData) {
  // validações básicas
  if (!data.usuarioId || !data.especialidadeId) throw new Error('usuarioId e especialidadeId são obrigatórios');
  const diasConvertidos = validarEDocumentarDias(data.diasAtendimento || []);

  return prisma.profissional.create({
    data: {
      usuarioId: data.usuarioId,
      especialidadeId: data.especialidadeId,
      diasAtendimento: diasConvertidos,
      horaInicio: data.horaInicio,
      horaFim: data.horaFim,
      biografia: data.biografia ?? null,
      formacao: data.formacao ?? null,
      fotoPerfil: data.fotoPerfil ?? null,
    }
  });
}

export async function atualizarProfissional(
  id: number,
  data: Partial<{
    especialidadeId: number;
    diasAtendimento: string[];
    horaInicio: string;
    horaFim: string;
    biografia: string | null;
    formacao: string | null;
    fotoPerfil: string | null;
  }>
) {
  let diasConvertidos: DiaSemana[] | undefined = undefined;

  if (data.diasAtendimento) {
    diasConvertidos = validarEDocumentarDias(data.diasAtendimento);
  }

  return prisma.profissional.update({
    where: { id },
    data: {
      ...('especialidadeId' in data ? { especialidadeId: data.especialidadeId } : {}),
      ...(diasConvertidos ? { diasAtendimento: diasConvertidos } : {}),
      ...(data.horaInicio ? { horaInicio: data.horaInicio } : {}),
      ...(data.horaFim ? { horaFim: data.horaFim } : {}),
      ...(data.biografia !== undefined ? { biografia: data.biografia } : {}),
      ...(data.formacao !== undefined ? { formacao: data.formacao } : {}),
      ...(data.fotoPerfil !== undefined ? { fotoPerfil: data.fotoPerfil } : {}),
    },
  });
}

export async function excluirProfissional(id: number) {
  // aqui você usou delete; se quiser soft-delete mudar lógica
  return prisma.profissional.delete({ where: { id } });
}

export async function getAgendaProfissional(id: number) {
  return prisma.profissional.findUnique({
    where: { id },
    select: {
      id: true,
      usuario: { select: { nome: true } },
      especialidade: { select: { nome: true } },
      diasAtendimento: true,
      horaInicio: true,
      horaFim: true,
    },
  });
}
