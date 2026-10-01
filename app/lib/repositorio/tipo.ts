import type {
  Atividade,
  CamposDoLead,
  Lead,
  NovaAtividade,
  NovoLead,
  Pagamento,
  Perfil,
} from "../tipos";

/**
 * Contrato de persistência.
 *
 * Existe porque a aplicação roda em dois modos que não podem se misturar: o
 * real (Supabase, por usuário, com RLS) e o de demonstração (memória, dados
 * fictícios). Quem chama não sabe qual está usando; regra de negócio — marcos
 * do funil, histórico, deduplicação — fica em `leads.ts`, acima daqui, para as
 * duas implementações se comportarem igual.
 *
 * `listarLeads` traz tudo de uma vez. Para uso próprio, centenas de leads cabem
 * numa resposta e o filtro na tela fica instantâneo. Se passar de alguns
 * milhares, é aqui que entra paginação.
 */
export type Repositorio = {
  obterPerfil(): Promise<Perfil>;
  salvarPerfil(perfil: Perfil): Promise<void>;

  listarLeads(): Promise<Lead[]>;
  obterLead(id: string): Promise<Lead | null>;
  leadsPorPlaceIds(placeIds: string[]): Promise<Pick<Lead, "id" | "place_id" | "favorito">[]>;
  /** Insere ou, se o place_id já é lead, devolve o existente com `jaExistia`. */
  inserirLead(dados: NovoLead): Promise<{ lead: Lead; jaExistia: boolean }>;
  atualizarLead(id: string, campos: CamposDoLead): Promise<Lead | null>;
  excluirLead(id: string): Promise<void>;

  listarAtividades(leadId: string): Promise<Atividade[]>;
  inserirAtividade(atividade: NovaAtividade): Promise<void>;

  listarPagamentos(leadId?: string): Promise<Pagamento[]>;
  inserirPagamento(pagamento: Omit<Pagamento, "id" | "criado_em">): Promise<void>;
  excluirPagamento(id: string): Promise<void>;

  contarConsultas(desde: Date): Promise<number>;
  registrarConsulta(tipo: string): Promise<void>;
};
