import type { Atividade, EmpresaEncontrada, Lead, Pagamento, Perfil, Status } from "../tipos";
import type { Repositorio } from "./tipo";

/**
 * Modo demonstração: tudo em memória, com dados fictícios.
 *
 * Entra quando o Supabase não está configurado. Fica no `globalThis` para
 * sobreviver ao recarregamento de módulo do `next dev`; reinicia quando o
 * servidor reinicia, e em hospedagem serverless cada instância tem a sua cópia
 * — serve para conhecer a ferramenta, não para trabalhar.
 *
 * Os dados são reconhecíveis como falsos de propósito: nomes com "(fictícia)",
 * DDD 00 (não existe, então o wa.me não chega em ninguém de verdade) e sites no
 * domínio reservado `.invalid`. Um telefone inventado "realista" seria o
 * celular de alguém.
 */

type Banco = {
  perfil: Perfil;
  leads: Lead[];
  atividades: Atividade[];
  pagamentos: Pagamento[];
};

const g = globalThis as typeof globalThis & { __leadpilotDemo?: Banco };

function diasAtras(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function diaDaqui(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
}

function leadDemo(parcial: Partial<Lead> & Pick<Lead, "id" | "nome" | "status">): Lead {
  return {
    place_id: null,
    telefone: null,
    whatsapp_confirmado: false,
    cidade: "Cidade Exemplo",
    segmento: null,
    favorito: false,
    servico: "Site institucional",
    observacoes: "",
    fatos_verificados: "",
    demo_url: null,
    valor_proposta: null,
    valor_fechado: null,
    proximo_contato: null,
    contatado_em: null,
    respondeu_em: null,
    proposta_em: null,
    fechado_em: null,
    perdido_em: null,
    criado_em: diasAtras(20),
    atualizado_em: diasAtras(1),
    ...parcial,
  };
}

function semear(): Banco {
  const leads: Lead[] = [
    leadDemo({
      id: "00000000-0000-4000-8000-000000000001",
      place_id: "demo-odonto-1",
      nome: "Clínica Sorriso Exemplo (fictícia)",
      telefone: "(00) 90000-0001",
      segmento: "Clínicas odontológicas",
      status: "novo",
      criado_em: diasAtras(2),
      favorito: true,
    }),
    leadDemo({
      id: "00000000-0000-4000-8000-000000000002",
      place_id: "demo-estetica-1",
      nome: "Estética Bem Estar Exemplo (fictícia)",
      telefone: "(00) 90000-0002",
      segmento: "Clínicas de estética",
      status: "demo_pronta",
      demo_url: "https://demo-estetica.exemplo.invalid",
      criado_em: diasAtras(9),
      proximo_contato: diaDaqui(1),
    }),
    leadDemo({
      id: "00000000-0000-4000-8000-000000000003",
      place_id: "demo-academia-1",
      nome: "Academia Força Exemplo (fictícia)",
      telefone: "(00) 3000-0003",
      segmento: "Academias",
      status: "contato_realizado",
      contatado_em: diasAtras(4),
      criado_em: diasAtras(15),
      proximo_contato: diaDaqui(-1),
    }),
    leadDemo({
      id: "00000000-0000-4000-8000-000000000004",
      place_id: "demo-restaurante-1",
      nome: "Restaurante Sabor Exemplo (fictício)",
      telefone: "(00) 90000-0004",
      segmento: "Restaurantes",
      status: "proposta_enviada",
      valor_proposta: 1800,
      contatado_em: diasAtras(12),
      respondeu_em: diasAtras(10),
      proposta_em: diasAtras(6),
      criado_em: diasAtras(25),
      proximo_contato: diaDaqui(3),
    }),
    leadDemo({
      id: "00000000-0000-4000-8000-000000000005",
      place_id: "demo-oficina-1",
      nome: "Oficina Motor Exemplo (fictícia)",
      telefone: "(00) 90000-0005",
      segmento: "Oficinas",
      status: "fechado",
      servico: "Landing page com WhatsApp",
      valor_proposta: 1500,
      valor_fechado: 1400,
      contatado_em: diasAtras(28),
      respondeu_em: diasAtras(27),
      proposta_em: diasAtras(24),
      fechado_em: diasAtras(18),
      criado_em: diasAtras(30),
    }),
    leadDemo({
      id: "00000000-0000-4000-8000-000000000006",
      place_id: "demo-loja-1",
      nome: "Loja Central Exemplo (fictícia)",
      telefone: "(00) 3000-0006",
      segmento: "Lojas",
      status: "perdido",
      contatado_em: diasAtras(20),
      perdido_em: diasAtras(14),
      criado_em: diasAtras(22),
    }),
  ];

  const atividades: Atividade[] = leads.map((l, i) => ({
    id: `demo-atv-${i}`,
    lead_id: l.id,
    tipo: "lead_criado",
    descricao: "Lead salvo a partir da busca (dados fictícios).",
    de_status: null,
    para_status: "novo",
    criado_em: l.criado_em,
  }));

  return {
    perfil: {
      nome: "Dev Exemplo",
      empresa: "Estúdio Exemplo",
      servicos: ["criação de sites", "landing pages com WhatsApp"],
      apresentacao: "Crio sites rápidos para empresas locais, com contato direto pelo WhatsApp.",
      mensagem_padrao: "",
    },
    leads,
    atividades,
    pagamentos: [
      {
        id: "demo-pg-1",
        lead_id: "00000000-0000-4000-8000-000000000005",
        valor: 700,
        recebido_em: diasAtras(17).slice(0, 10),
        descricao: "Entrada (fictícia)",
        criado_em: diasAtras(17),
      },
    ],
  };
}

// Devolve sempre cópia. Entregar o objeto guardado fazia o "antes" de quem
// chama mudar junto com a gravação: a regra que compara o lead antes e depois
// (cadastrou demonstração → "Demonstração pronta") nunca via diferença.
const copia = <T,>(v: T): T => structuredClone(v);

function banco(): Banco {
  g.__leadpilotDemo ??= semear();
  return g.__leadpilotDemo;
}

export const repositorioDemo: Repositorio = {
  async obterPerfil() {
    return copia(banco().perfil);
  },
  async salvarPerfil(perfil) {
    banco().perfil = copia(perfil);
  },
  async listarLeads() {
    return copia(banco().leads).sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em));
  },
  async obterLead(id) {
    return copia(banco().leads.find((l) => l.id === id) ?? null);
  },
  async leadsPorPlaceIds(placeIds) {
    return banco()
      .leads.filter((l) => l.place_id && placeIds.includes(l.place_id))
      .map(({ id, place_id, favorito }) => ({ id, place_id, favorito }));
  },
  async inserirLead(dados) {
    const existente = dados.place_id ? banco().leads.find((l) => l.place_id === dados.place_id) : undefined;
    if (existente) return { lead: copia(existente), jaExistia: true };
    const agora = new Date().toISOString();
    const novo = leadDemo({
      ...dados,
      id: crypto.randomUUID(),
      status: "novo" as Status,
      favorito: dados.favorito ?? false,
      servico: null,
      criado_em: agora,
      atualizado_em: agora,
    });
    banco().leads.push(novo);
    return { lead: copia(novo), jaExistia: false };
  },
  async atualizarLead(id, campos) {
    const l = banco().leads.find((x) => x.id === id);
    if (!l) return null;
    Object.assign(l, campos, { atualizado_em: new Date().toISOString() });
    return copia(l);
  },
  async excluirLead(id) {
    const b = banco();
    b.leads = b.leads.filter((l) => l.id !== id);
    b.atividades = b.atividades.filter((a) => a.lead_id !== id);
    b.pagamentos = b.pagamentos.filter((p) => p.lead_id !== id);
  },
  async listarAtividades(leadId) {
    return copia(banco().atividades.filter((a) => a.lead_id === leadId)).sort((a, b) =>
      b.criado_em.localeCompare(a.criado_em),
    );
  },
  async inserirAtividade(a) {
    banco().atividades.push({
      de_status: null,
      para_status: null,
      ...a,
      id: crypto.randomUUID(),
      criado_em: new Date().toISOString(),
    });
  },
  async listarPagamentos(leadId) {
    return copia(banco().pagamentos.filter((p) => !leadId || p.lead_id === leadId));
  },
  async inserirPagamento(p) {
    banco().pagamentos.push({ ...p, id: crypto.randomUUID(), criado_em: new Date().toISOString() });
  },
  async excluirPagamento(id) {
    const b = banco();
    b.pagamentos = b.pagamentos.filter((p) => p.id !== id);
  },
  // Modo demonstração nunca chama o Google, então não há o que limitar.
  async contarConsultas() {
    return 0;
  },
  async registrarConsulta() {},
};

const NOMES_FICTICIOS: Record<string, string[]> = {
  odonto: ["Odonto Vida", "Sorriso Feliz", "Dente Forte", "Clínica Oral Mais"],
  estetica: ["Estética Bela Pele", "Espaço Renovar", "Clínica Harmonia", "Studio Leveza"],
  academia: ["Academia Movimento", "Box Treino Livre", "Studio Corpo Ativo", "Academia Ponto Fit"],
  restaurante: ["Restaurante Prato Cheio", "Cantina da Praça", "Bistrô Esquina", "Grill do Bairro"],
  oficina: ["Auto Center Rota", "Oficina Pistão", "Mecânica Boa Viagem", "Centro Automotivo Giro"],
  loja: ["Loja Ponto Certo", "Casa das Utilidades", "Empório da Vila", "Boutique Alameda"],
};

/**
 * Resultado de busca fictício, para mostrar a tela funcionando sem chave do
 * Google. A tela marca esses resultados como fictícios em destaque; nada aqui
 * pode parecer empresa real.
 */
export function buscaFicticia(segmento: string, centro: { latitude: number; longitude: number } | null): EmpresaEncontrada[] {
  const nomes = NOMES_FICTICIOS[segmento] ?? ["Empresa Alfa", "Empresa Beta", "Empresa Gama", "Empresa Delta"];
  const base = centro ?? { latitude: -25.39, longitude: -51.46 };
  return nomes.map((nome, i) => {
    const temSite = i % 2 === 1;
    const temTelefone = i !== 3;
    return {
      placeId: `demo-${segmento}-${i + 10}`,
      nome: `${nome} (fictícia)`,
      categoria: "Exemplo fictício",
      endereco: `Rua Exemplo, ${100 + i * 37} — Cidade Exemplo`,
      telefone: temTelefone ? `(00) 9000${i}-00${i}${i}` : null,
      telefoneInternacional: null,
      site: temSite ? `https://${nome.toLowerCase().replace(/\W+/g, "-")}.exemplo.invalid` : null,
      avaliacao: Math.round((3.8 + i * 0.3) * 10) / 10,
      totalAvaliacoes: 12 + i * 21,
      mapsUrl: null,
      latitude: base.latitude + i * 0.004,
      longitude: base.longitude - i * 0.003,
      distanciaKm: centro ? Math.round((0.4 + i * 0.6) * 10) / 10 : null,
    };
  });
}
