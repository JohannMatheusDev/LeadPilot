import Icone, { type NomeIcone } from "./Icone";

/**
 * Estados de tela vazia e de mensagem, usados por todas as rotas.
 *
 * `Aviso` usa `role="status"` (ou `alert` para erro) para o leitor de tela
 * anunciar o resultado de uma ação — sem isso, quem não enxerga a tela clica
 * em "Salvar" e não fica sabendo se salvou.
 */

export function EstadoVazio({
  icone,
  titulo,
  children,
}: {
  icone: NomeIcone;
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="cartao flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-superficie-2 text-texto-suave">
        <Icone nome={icone} className="size-6" />
      </span>
      <h2 className="text-base font-semibold">{titulo}</h2>
      {children && <div className="mt-2 max-w-md text-sm text-texto-suave">{children}</div>}
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "erro" | "ok" | "info"; children: React.ReactNode }) {
  const estilo =
    tipo === "erro"
      ? "border-perigo/40 bg-perigo/10 text-perigo"
      : tipo === "ok"
        ? "border-verde/40 bg-verde/10 text-verde"
        : "border-borda bg-superficie-2 text-texto-suave";
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${estilo}`}>
      {children}
    </div>
  );
}

export function CabecalhoDaPagina({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-texto-suave">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export function EtiquetaStatus({ status, nome }: { status: string; nome: string }) {
  const classe =
    status === "fechado" ? "etiqueta-verde" : status === "perdido" ? "etiqueta border-perigo/40 text-perigo" : "etiqueta-neutra";
  return <span className={classe}>{nome}</span>;
}
