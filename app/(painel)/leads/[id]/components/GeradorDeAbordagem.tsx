"use client";

import Link from "next/link";
import { useState } from "react";
import { Aviso } from "../../../../components/Estados";
import Icone from "../../../../components/Icone";
import { registrarEnvio, registrarPreparo } from "../../../../lib/acoes/leads";
import { antesDoContato } from "../../../../lib/leads";
import { ESTILOS, gerarMensagem, type Estilo } from "../../../../lib/mensagens";
import { linkWhatsapp, pareceCelular } from "../../../../lib/telefone";
import type { Lead, Perfil } from "../../../../lib/tipos";

/**
 * Prepara a mensagem de abordagem e abre o WhatsApp com ela preenchida.
 *
 * O envio é sempre manual. Abrir o WhatsApp vai para o histórico como
 * "envio não confirmado"; só o botão "Registrar envio", que a pessoa aperta
 * depois de mandar, conta como contato realizado. Contar a abertura como envio
 * inflaria o dashboard com mensagens que ficaram no rascunho.
 */
export default function GeradorDeAbordagem({
  lead,
  perfil,
  siteNoGoogle,
}: {
  lead: Lead;
  perfil: Perfil;
  /** string: o Google informa site; null: o Google respondeu sem site; undefined: não consultado. */
  siteNoGoogle: string | null | undefined;
}) {
  const semSiteConfirmadoNoGoogle = siteNoGoogle === null;
  const [estilo, setEstilo] = useState<Estilo>("casual");
  const [servico, setServico] = useState(lead.servico ?? perfil.servicos[0] ?? "");
  // O gerador não remonta ao salvar o lead (perderia a confirmação de envio
  // pendente). Quando o serviço do lead muda no formulário, ele passa a valer
  // aqui também — antes, a mensagem seguia com o serviço antigo.
  const [servicoDoLead, setServicoDoLead] = useState(lead.servico);
  if (lead.servico !== servicoDoLead) {
    setServicoDoLead(lead.servico);
    setServico(lead.servico ?? perfil.servicos[0] ?? "");
  }
  const [mencionarSemSite, setMencionarSemSite] = useState(true);
  const [incluirLink, setIncluirLink] = useState(false);
  const [editado, setEditado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const gerado = gerarMensagem({
    estilo,
    meuNome: perfil.nome,
    minhaEmpresa: perfil.empresa,
    empresa: lead.nome,
    servico,
    fatos: lead.fatos_verificados,
    // A frase de "não encontrei site" só é possível quando o Google
    // respondeu sem site. Sem consulta, não há o que afirmar.
    mencionarSemSite: semSiteConfirmadoNoGoogle && mencionarSemSite,
    demoUrl: lead.demo_url,
    incluirLink,
    mensagemPadrao: perfil.mensagem_padrao,
  });
  const texto = editado ?? ("texto" in gerado ? gerado.texto : "");
  const whatsapp = linkWhatsapp(lead.telefone, texto);
  const nomeEstilo = ESTILOS.find((e) => e.id === estilo)?.nome ?? estilo;

  // Qualquer mudança de opção descarta a edição manual: o texto editado
  // pertencia às opções anteriores.
  const opcao =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setEditado(null);
    };

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      return setAviso({ tipo: "erro", texto: "O navegador bloqueou a cópia. Selecione o texto e copie manualmente." });
    }
    setAviso({ tipo: "ok", texto: "Mensagem copiada." });
    await registrarPreparo(lead.id, "mensagem_copiada", nomeEstilo);
  }

  async function aoAbrirWhatsapp() {
    setAguardandoConfirmacao(true);
    setAviso(null);
    await registrarPreparo(lead.id, "whatsapp_aberto", nomeEstilo);
  }

  async function confirmarEnvio(avancar: boolean) {
    setRegistrando(true);
    const r = await registrarEnvio(lead.id, avancar);
    setRegistrando(false);
    if (!r.ok) return setAviso({ tipo: "erro", texto: r.erro });
    setAguardandoConfirmacao(false);
    setAviso({ tipo: "ok", texto: avancar ? "Envio registrado. Lead movido para Contato realizado." : "Envio registrado no histórico." });
  }

  return (
    <section className="cartao space-y-5 p-5 sm:p-6" aria-labelledby="gerador-titulo">
      <div>
        <h2 id="gerador-titulo" className="text-lg font-semibold">
          Gerador de abordagem
        </h2>
        <p className="mt-1 text-sm text-texto-suave">
          Usa só o que está cadastrado: seu perfil, o serviço, a observação verificada e a demonstração.
        </p>
      </div>

      <div role="radiogroup" aria-label="Estilo da mensagem" className="flex flex-wrap gap-2">
        {ESTILOS.map((e) => (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={estilo === e.id}
            onClick={() => {
              opcao(setEstilo)(e.id);
              // "Direto" já manda o link; os outros pedem licença antes.
              setIncluirLink(e.id === "direto");
            }}
            className={`botao border ${estilo === e.id ? "border-verde bg-verde/10 text-verde" : "border-borda text-texto-suave hover:text-texto"}`}
          >
            {e.nome}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="gerador-servico" className="rotulo">
            Serviço oferecido
          </label>
          <input
            id="gerador-servico"
            list="gerador-servicos"
            value={servico}
            onChange={(e) => opcao(setServico)(e.target.value)}
            placeholder="criação de sites"
            className="campo"
          />
          <datalist id="gerador-servicos">
            {perfil.servicos.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p className="ajuda">Completa a frase “trabalho com …”.</p>
        </div>
        <div className="space-y-2 text-sm">
          <label className={`flex items-start gap-2 ${semSiteConfirmadoNoGoogle ? "" : "opacity-60"}`}>
            <input
              type="checkbox"
              checked={semSiteConfirmadoNoGoogle && mencionarSemSite}
              disabled={!semSiteConfirmadoNoGoogle}
              onChange={(e) => opcao(setMencionarSemSite)(e.target.checked)}
              className="mt-0.5 accent-verde-forte"
            />
            <span>
              Mencionar que não encontrei site informado no Google
              <span className="block text-xs text-texto-suave">
                {siteNoGoogle === undefined
                  ? lead.place_id
                    ? "Disponível depois de consultar o Google."
                    : "Lead manual: não há consulta ao Google para citar."
                  : siteNoGoogle
                    ? "O Google informa um site para esta empresa."
                    : "O Google não informa site. Isso não prova que não exista um."}
              </span>
            </span>
          </label>
          <label className={`flex items-start gap-2 ${lead.demo_url ? "" : "opacity-60"}`}>
            <input
              type="checkbox"
              checked={Boolean(lead.demo_url) && incluirLink}
              disabled={!lead.demo_url}
              onChange={(e) => opcao(setIncluirLink)(e.target.checked)}
              className="mt-0.5 accent-verde-forte"
            />
            <span>
              Enviar o link da demonstração já na mensagem
              {!lead.demo_url && (
                <span className="block text-xs text-texto-suave">Cadastre o link da demonstração para mencionar a prévia.</span>
              )}
            </span>
          </label>
        </div>
      </div>

      {"erro" in gerado && editado == null ? (
        <Aviso tipo="erro">
          {gerado.erro}{" "}
          {gerado.erro.includes("Configurações") && (
            <Link href="/configuracoes" className="underline">
              Abrir Configurações
            </Link>
          )}
        </Aviso>
      ) : (
        <div>
          <label htmlFor="mensagem" className="rotulo">
            Mensagem (você pode editar)
          </label>
          <textarea id="mensagem" value={texto} onChange={(e) => setEditado(e.target.value)} rows={7} className="campo leading-relaxed" />
          {editado != null && (
            <button type="button" onClick={() => setEditado(null)} className="botao-fantasma mt-2 px-2 text-xs">
              Descartar edição e gerar de novo
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copiar} disabled={!texto} className="botao-secundario">
            <Icone nome="copiar" className="size-4" />
            Copiar mensagem
          </button>
          {whatsapp && texto ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={aoAbrirWhatsapp} className="botao-primario">
              <Icone nome="mensagem" className="size-4" />
              Abrir no WhatsApp
            </a>
          ) : (
            <button type="button" disabled className="botao-primario" aria-describedby="whatsapp-ajuda">
              <Icone nome="mensagem" className="size-4" />
              Abrir no WhatsApp
            </button>
          )}
        </div>
        <p id="whatsapp-ajuda" className="text-xs text-texto-suave">
          {!lead.telefone
            ? "Cadastre um telefone para abrir o WhatsApp."
            : !whatsapp
              ? "O telefone cadastrado não está num formato válido para o WhatsApp."
              : lead.whatsapp_confirmado
                ? "WhatsApp confirmado por você. O envio é feito por você, no WhatsApp."
                : `WhatsApp não confirmado${pareceCelular(lead.telefone) ? "" : " — o número parece fixo"}. O envio é feito por você, no WhatsApp.`}
        </p>
      </div>

      {aguardandoConfirmacao && (
        <div role="status" className="space-y-3 rounded-xl border border-verde/40 bg-verde/5 p-4 text-sm">
          <p>
            <strong>Você enviou a mensagem?</strong> Abrir o WhatsApp não registra envio. Confirme só depois de mandar.
          </p>
          <div className="flex flex-wrap gap-2">
            {antesDoContato(lead.status) && (
              <button type="button" onClick={() => confirmarEnvio(true)} disabled={registrando} className="botao-primario">
                Enviei — mover para Contato realizado
              </button>
            )}
            <button type="button" onClick={() => confirmarEnvio(false)} disabled={registrando} className="botao-secundario">
              Enviei — só registrar
            </button>
            <button type="button" onClick={() => setAguardandoConfirmacao(false)} className="botao-fantasma">
              Não enviei
            </button>
          </div>
        </div>
      )}

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
    </section>
  );
}
