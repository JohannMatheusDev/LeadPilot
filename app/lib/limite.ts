import { LIMITE_CONSULTAS_POR_DIA, LIMITE_CONSULTAS_POR_MINUTO } from "./config";
import type { Repositorio } from "./repositorio/tipo";

/**
 * Freio de gasto na API do Google, contado no banco.
 *
 * Contador em memória não serve na Vercel: cada função serverless tem a sua e
 * o limite se multiplicaria pelo número de instâncias. A contagem vai ao
 * Postgres, por usuário, e a consulta é registrada ANTES da chamada ao Google
 * — se registrasse depois, uma chamada que estoura o tempo passaria sem contar
 * e continuaria cobrada.
 *
 * Complementa, não substitui, a cota diária configurada no Google Cloud
 * Console, que é a trava que vale mesmo se este código tiver um bug.
 */

export class LimiteExcedido extends Error {}

export async function reservarConsulta(repo: Repositorio, tipo: "busca" | "detalhes"): Promise<void> {
  const agora = Date.now();
  const [noMinuto, noDia] = await Promise.all([
    repo.contarConsultas(new Date(agora - 60_000)),
    repo.contarConsultas(new Date(agora - 86_400_000)),
  ]);
  if (noMinuto >= LIMITE_CONSULTAS_POR_MINUTO) {
    throw new LimiteExcedido(`Limite de ${LIMITE_CONSULTAS_POR_MINUTO} consultas por minuto atingido. Aguarde um pouco.`);
  }
  if (noDia >= LIMITE_CONSULTAS_POR_DIA) {
    throw new LimiteExcedido(
      `Limite de ${LIMITE_CONSULTAS_POR_DIA} consultas em 24 horas atingido. Ajuste PLACES_LIMITE_POR_DIA se precisar de mais.`,
    );
  }
  await repo.registrarConsulta(tipo);
}
