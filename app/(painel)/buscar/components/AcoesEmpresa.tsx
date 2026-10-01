"use client";

import Link from "next/link";
import Icone from "../../../components/Icone";
import type { EmpresaEncontrada } from "../../../lib/tipos";
import { linkMaps } from "./criterios";

export type Salvo = { id: string; favorito: boolean };

/**
 * Ações de uma empresa da busca, iguais no card e na tabela.
 *
 * Favoritar e anotar uma empresa ainda não salva cria o lead junto: o dado
 * próprio (favorito, observação) precisa estar pendurado em algum registro, e
 * o lead é esse registro. A tela avisa quando isso acontece.
 */
export default function AcoesEmpresa({
  empresa,
  salvo,
  podeSalvar,
  ocupado,
  compacto = false,
  onDetalhes,
  onSalvar,
  onFavoritar,
  onAnotar,
}: {
  empresa: EmpresaEncontrada;
  salvo: Salvo | undefined;
  podeSalvar: boolean;
  ocupado: boolean;
  compacto?: boolean;
  onDetalhes: () => void;
  onSalvar: () => void;
  onFavoritar: () => void;
  onAnotar: () => void;
}) {
  const maps = linkMaps(empresa);
  const rotulo = (texto: string) => (compacto ? <span className="sr-only">{texto}</span> : texto);
  const classe = compacto ? "botao-icone" : "botao-secundario px-3";
  const motivoBloqueio = podeSalvar ? undefined : "Exemplo fictício: não pode virar lead real";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {salvo ? (
        <Link href={`/leads/${salvo.id}`} className={compacto ? "botao-icone text-verde" : "botao-primario px-3"}>
          <Icone nome="check" className="size-4" />
          {rotulo("Abrir lead")}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onSalvar}
          disabled={ocupado || !podeSalvar}
          title={motivoBloqueio}
          className={compacto ? "botao-icone" : "botao-primario px-3"}
        >
          <Icone nome="mais" className="size-4" />
          {rotulo("Salvar lead")}
        </button>
      )}
      <button
        type="button"
        onClick={onFavoritar}
        disabled={ocupado || !podeSalvar}
        title={motivoBloqueio}
        aria-pressed={Boolean(salvo?.favorito)}
        className={`${classe} ${salvo?.favorito ? "text-alerta" : ""}`}
      >
        <Icone nome="estrela" className="size-4" preenchido={salvo?.favorito} />
        {rotulo(salvo?.favorito ? "Favorito" : "Favoritar")}
      </button>
      <button type="button" onClick={onAnotar} disabled={ocupado || !podeSalvar} title={motivoBloqueio} className={classe}>
        <Icone nome="nota" className="size-4" />
        {rotulo("Observação")}
      </button>
      <button type="button" onClick={onDetalhes} className={classe}>
        <Icone nome="info" className="size-4" />
        {rotulo("Detalhes")}
      </button>
      {empresa.site && (
        <a href={empresa.site} target="_blank" rel="noopener noreferrer" className={classe}>
          <Icone nome="globo" className="size-4" />
          {rotulo("Abrir site")}
        </a>
      )}
      {maps && (
        <a href={maps} target="_blank" rel="noopener noreferrer" className={classe}>
          <Icone nome="mapa" className="size-4" />
          {rotulo("Google Maps")}
        </a>
      )}
    </div>
  );
}
