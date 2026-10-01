/**
 * Tipos do domínio de prospecção.
 *
 * Os campos das entidades persistidas usam o mesmo nome da coluna no Postgres
 * (snake_case). Mapear para camelCase em cada leitura e escrita era mais um
 * lugar para um campo novo ser esquecido; com o nome igual, o que o banco
 * devolve já é o objeto da tela.
 */

export const ETAPAS = [
  { id: "novo", nome: "Novo lead" },
  { id: "em_analise", nome: "Em análise" },
  { id: "demo_pronta", nome: "Demonstração pronta" },
  { id: "contato_realizado", nome: "Contato realizado" },
  { id: "cliente_respondeu", nome: "Cliente respondeu" },
  { id: "proposta_enviada", nome: "Proposta enviada" },
  { id: "fechado", nome: "Fechado" },
  { id: "perdido", nome: "Perdido" },
] as const;

export type Status = (typeof ETAPAS)[number]["id"];

export const STATUS_VALIDOS: readonly string[] = ETAPAS.map((e) => e.id);

export function nomeDaEtapa(status: string): string {
  return ETAPAS.find((e) => e.id === status)?.nome ?? status;
}

export function ehStatus(valor: unknown): valor is Status {
  return typeof valor === "string" && STATUS_VALIDOS.includes(valor);
}

export type Lead = {
  id: string;
  place_id: string | null;
  nome: string;
  telefone: string | null;
  whatsapp_confirmado: boolean;
  cidade: string | null;
  segmento: string | null;
  status: Status;
  favorito: boolean;
  servico: string | null;
  observacoes: string;
  fatos_verificados: string;
  demo_url: string | null;
  valor_proposta: number | null;
  valor_fechado: number | null;
  proximo_contato: string | null;
  contatado_em: string | null;
  respondeu_em: string | null;
  proposta_em: string | null;
  fechado_em: string | null;
  perdido_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

/** Campos que a tela pode editar diretamente. Status e marcos passam por `moverLead`. */
export type CamposEditaveis = Partial<
  Pick<
    Lead,
    | "nome"
    | "telefone"
    | "whatsapp_confirmado"
    | "cidade"
    | "segmento"
    | "favorito"
    | "servico"
    | "observacoes"
    | "fatos_verificados"
    | "demo_url"
    | "valor_proposta"
    | "valor_fechado"
    | "proximo_contato"
  >
>;

export type CamposDoLead = CamposEditaveis &
  Partial<
    Pick<Lead, "status" | "contatado_em" | "respondeu_em" | "proposta_em" | "fechado_em" | "perdido_em">
  >;

export type NovoLead = {
  place_id: string | null;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  segmento: string | null;
  favorito?: boolean;
};

export type TipoAtividade =
  | "lead_criado"
  | "status"
  | "nota"
  | "edicao"
  | "demo_registrada"
  | "mensagem_copiada"
  | "whatsapp_aberto"
  | "mensagem_enviada"
  | "pagamento";

export type Atividade = {
  id: string;
  lead_id: string;
  tipo: TipoAtividade;
  descricao: string;
  de_status: string | null;
  para_status: string | null;
  criado_em: string;
};

export type NovaAtividade = Omit<Atividade, "id" | "criado_em" | "de_status" | "para_status"> & {
  de_status?: string | null;
  para_status?: string | null;
};

export type Pagamento = {
  id: string;
  lead_id: string;
  valor: number;
  recebido_em: string;
  descricao: string;
  criado_em: string;
};

export type Perfil = {
  nome: string;
  empresa: string;
  servicos: string[];
  apresentacao: string;
  mensagem_padrao: string;
};

export const PERFIL_VAZIO: Perfil = {
  nome: "",
  empresa: "",
  servicos: [],
  apresentacao: "",
  mensagem_padrao: "",
};

/**
 * Empresa como veio da busca. Nunca é gravada inteira: vive só na memória da
 * tela, e o que vira lead é apenas o place_id mais nome e telefone confirmados.
 */
export type EmpresaEncontrada = {
  placeId: string;
  nome: string;
  categoria: string | null;
  endereco: string | null;
  telefone: string | null;
  telefoneInternacional: string | null;
  site: string | null;
  avaliacao: number | null;
  totalAvaliacoes: number | null;
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  distanciaKm: number | null;
};

export type DetalhesEmpresa = EmpresaEncontrada & {
  situacao: string | null;
  horarios: string[];
};

export type Resultado<T = undefined> = { ok: true; dados: T } | { ok: false; erro: string };
