"use server";

import { refresh } from "next/cache";
import type { Perfil, Resultado } from "../tipos";
import * as v from "../validacao";
import { executar } from "./executar";

export async function salvarPerfil(dados: Perfil): Promise<Resultado> {
  return executar(async ({ repo }) => {
    const servicos = (Array.isArray(dados?.servicos) ? dados.servicos : [])
      .map((s) => v.texto(s, "Servico", 120))
      .filter(Boolean)
      .slice(0, 20);
    await repo.salvarPerfil({
      nome: v.texto(dados.nome, "Nome", 120),
      empresa: v.texto(dados.empresa, "Empresa", 120),
      servicos,
      apresentacao: v.texto(dados.apresentacao, "Apresentacao", 2000),
      mensagem_padrao: v.texto(dados.mensagem_padrao, "Mensagem padrao", 2000),
    });
    refresh();
    return undefined;
  });
}
