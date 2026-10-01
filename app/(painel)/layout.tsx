import Navegacao from "../components/Navegacao";
import { exigirContexto } from "../lib/contexto";

/**
 * Moldura de todas as telas internas. Pede o contexto aqui para nenhuma
 * página filha renderizar sem sessão, e mostra a faixa de demonstração em
 * todas as telas — os dados fictícios não podem ser confundidos com reais em
 * nenhum ponto da navegação.
 */
export default async function LayoutDoPainel({ children }: { children: React.ReactNode }) {
  const ctx = await exigirContexto();
  return (
    <div className="min-h-full">
      <Navegacao email={ctx.email} modo={ctx.modo} />
      <div className="lg:pl-64">
        {ctx.modo === "demo" && (
          <div role="note" className="border-b border-alerta/30 bg-alerta/10 px-4 py-2.5 text-center text-sm text-alerta">
            <strong className="font-semibold">Modo demonstração.</strong> Dados fictícios em memória, separados de
            qualquer dado real. Nenhuma empresa real é consultada. Configure o Supabase para usar de verdade.
          </div>
        )}
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
