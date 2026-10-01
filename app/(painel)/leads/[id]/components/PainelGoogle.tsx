"use client";

import Icone from "../../../../components/Icone";
import type { EstadoGoogle } from "./DetalheDoLead";

/**
 * Dados atuais do Google para o lead, consultados ao abrir a tela.
 *
 * Não vêm do banco porque não são gravados: endereço, site e avaliação são
 * conteúdo do Google, e os termos da Places API só permitem guardar o
 * place_id. Por isso cada abertura do lead é uma consulta (contada no limite).
 */
export default function PainelGoogle({ estado, manual }: { estado: EstadoGoogle; manual: boolean }) {
  return (
    <section className="cartao p-5" aria-labelledby="google-titulo" aria-busy={estado.fase === "carregando"}>
      <h2 id="google-titulo" className="mb-3 text-base font-semibold">
        No Google
      </h2>
      {estado.fase === "indisponivel" && (
        <p className="text-sm text-texto-suave">
          {manual
            ? "Lead cadastrado manualmente, sem vínculo com o Google."
            : "Consulta ao Google indisponível: a chave do Places não está configurada."}
        </p>
      )}
      {estado.fase === "carregando" && <p className="text-sm text-texto-suave">Consultando o Google…</p>}
      {estado.fase === "erro" && <p className="text-sm text-perigo">{estado.erro}</p>}
      {estado.fase === "ok" && (
        <div className="space-y-3 text-sm">
          {estado.dados.ficticio && <p className="etiqueta-alerta">Dados fictícios</p>}
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-texto-suave">Categoria</dt>
              <dd>{estado.dados.categoria ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-texto-suave">Endereço</dt>
              <dd>{estado.dados.endereco ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-texto-suave">Telefone no Google</dt>
              <dd>{estado.dados.telefone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-texto-suave">Site</dt>
              <dd className="break-all">
                {estado.dados.site ? (
                  <a href={estado.dados.site} target="_blank" rel="noopener noreferrer" className="text-verde underline">
                    {estado.dados.site.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <span className="text-alerta">Sem site informado no Google</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-texto-suave">Avaliação</dt>
              <dd>
                {estado.dados.avaliacao != null
                  ? `${estado.dados.avaliacao.toFixed(1).replace(".", ",")} (${estado.dados.totalAvaliacoes ?? 0} avaliações)`
                  : "Sem avaliações"}
              </dd>
            </div>
          </dl>
          {estado.dados.mapsUrl && (
            <a href={estado.dados.mapsUrl} target="_blank" rel="noopener noreferrer" className="botao-secundario w-full">
              <Icone nome="mapa" className="size-4" />
              Abrir no Google Maps
            </a>
          )}
          {!estado.dados.ficticio && <p className="text-right text-xs text-texto-suave">Fonte: Google Maps</p>}
        </div>
      )}
    </section>
  );
}
