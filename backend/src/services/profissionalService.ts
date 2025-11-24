import { PrismaClient, DiaSemana } from '@prisma/client';

const prisma = new PrismaClient();

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
    throw error;
  }
}

export async function buscarProfissionalPorId(id: number) {
  const profissional = await prisma.profissional.findUnique({
    where: { id },
    include: { usuario: true, especialidade: true },
  });
  if (!profissional) throw new Error();
  return profissional;
}

export async function criarProfissional(data: {
  usuarioId: number;
  especialidadeId: number;
  diasAtendimento: string[];
  horaInicio: string;
  horaFim: string;
  biografia: string;
  formacao: string;
  fotoPerfil: string;
}) {
  const diasConvertidos = data.diasAtendimento.map((dia) => {
    if (!Object.values(DiaSemana).includes(dia as DiaSemana)) {
      throw new Error(`Dia inválido: ${dia}`);
    }
    return dia as DiaSemana;
  });

  return prisma.profissional.create({
    data: {
      usuarioId: data.usuarioId,
      especialidadeId: data.especialidadeId,
      diasAtendimento: diasConvertidos,
      horaInicio: data.horaInicio,
      horaFim: data.horaFim,
      biografia: data.biografia,
      formacao: data.formacao,
      fotoPerfil: data.fotoPerfil,
    },
  });
}


export async function atualizarProfissional(
  id: number,
  data: Partial<{
    especialidadeId: number;
    diasAtendimento: string[];
    horaInicio: string;
    horaFim: string;
  }>
) {
  let diasConvertidos: DiaSemana[] | undefined = undefined;

  if (data.diasAtendimento) {
    diasConvertidos = data.diasAtendimento.map((dia) => {
      if (!Object.values(DiaSemana).includes(dia as DiaSemana)) {
        throw new Error(`Dia inválido: ${dia}`);
      }
      return dia as DiaSemana;
    });
  }

  return prisma.profissional.update({
    where: { id },
    data: {
      ...data,
      diasAtendimento: diasConvertidos,
    },
  });
}

export async function excluirProfissional(id: number) {
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
