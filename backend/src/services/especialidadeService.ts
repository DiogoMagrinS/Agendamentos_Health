import { prisma } from '../config/prisma';

export async function listarEspecialidades() {
  return prisma.especialidade.findMany();
}

export async function buscarEspecialidadePorId(id: number) {
  const especialidade = await prisma.especialidade.findUnique({ where: { id } });
  if (!especialidade) throw new Error();
  return especialidade;
}

export async function criarEspecialidade(nome: string) {
  return prisma.especialidade.create({ data: { nome } });
}

export async function atualizarEspecialidade(id: number, nome: string) {
  return prisma.especialidade.update({
    where: { id },
    data: { nome },
  });
}

export async function excluirEspecialidade(id: number) {
  return prisma.especialidade.delete({ where: { id } });
}
