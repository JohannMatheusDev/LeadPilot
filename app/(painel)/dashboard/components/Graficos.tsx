import type { Barra } from "../../../lib/metricas";

/**
 * Gráficos de série única, desenhados com CSS.
 *
 * São duas contagens simples; uma biblioteca de gráficos seria a maior
 * dependência do projeto para desenhar retângulos. Série única dispensa
 * legenda — o título diz o que é — e uma cor só (o verde) basta.
 *
 * Cada barra tem dica ao passar o mouse ou focar (CSS puro, sem JS), e os
 * mesmos números ficam numa tabela recolhível, para leitor de tela e para
 * quem prefere ler os valores.
 */

function TabelaDosDados({ barras, coluna }: { barras: Barra[]; coluna: string }) {
  return (
    <details className="mt-3 text-xs text-texto-suave">
      <summary className="cursor-pointer select-none hover:text-texto">Ver dados em tabela</summary>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr>
            <th scope="col" className="py-1 font-medium">
              {coluna}
            </th>
            <th scope="col" className="py-1 text-right font-medium">
              Leads
            </th>
          </tr>
        </thead>
        <tbody>
          {barras.map((b) => (
            <tr key={b.rotulo} className="border-t border-borda">
              <td className="py-1">{b.rotulo}</td>
              <td className="py-1 text-right tabular-nums text-texto">{b.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function GraficoColunas({ titulo, barras }: { titulo: string; barras: Barra[] }) {
  const maximo = Math.max(1, ...barras.map((b) => b.valor));
  // Rótulo do eixo em toda barra embola com 30 dias; mostramos ~6 marcas.
  const passo = Math.max(1, Math.ceil(barras.length / 6));
  return (
    <figure className="cartao p-5">
      <figcaption className="mb-4 text-sm font-semibold">{titulo}</figcaption>
      <div className="flex h-40 items-end gap-0.5 border-b border-borda" role="img" aria-label={`${titulo}. Valores na tabela abaixo.`}>
        {barras.map((b) => (
          <div key={b.rotulo} className="group relative flex h-full flex-1 items-end" tabIndex={0} aria-label={b.dica}>
            <div
              className="w-full rounded-t-[4px] bg-verde-forte transition-colors group-hover:bg-verde group-focus:bg-verde"
              style={{ height: b.valor ? `${(b.valor / maximo) * 100}%` : "0" }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-borda bg-superficie-2 px-2 py-1 text-xs text-texto shadow-lg group-hover:block group-focus:block">
              {b.dica}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-0.5 text-[10px] text-texto-suave" aria-hidden="true">
        {barras.map((b, i) => (
          <span key={b.rotulo} className="flex-1 text-center">
            {i % passo === 0 ? b.rotulo : ""}
          </span>
        ))}
      </div>
      <TabelaDosDados barras={barras} coluna="Período" />
    </figure>
  );
}

export function GraficoBarras({ titulo, barras }: { titulo: string; barras: Barra[] }) {
  const maximo = Math.max(1, ...barras.map((b) => b.valor));
  return (
    <figure className="cartao p-5">
      <figcaption className="mb-4 text-sm font-semibold">{titulo}</figcaption>
      <ul className="space-y-2.5" aria-label={titulo}>
        {barras.map((b) => (
          <li key={b.rotulo} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm" title={b.dica}>
            <span className="truncate text-texto-suave">{b.rotulo}</span>
            <span className="h-2.5 rounded-r-[4px] bg-superficie-2">
              <span
                className="block h-full rounded-r-[4px] bg-verde-forte"
                style={{ width: b.valor ? `${Math.max(2, (b.valor / maximo) * 100)}%` : "0" }}
              />
            </span>
            <span className="text-right tabular-nums">{b.valor}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
