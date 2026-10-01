import Icone from "../../../components/Icone";
import { pareceCelular } from "../../../lib/telefone";
import type { EmpresaEncontrada } from "../../../lib/tipos";
import { CRITERIO_OPORTUNIDADE, ehOportunidade } from "./criterios";

/**
 * Etiquetas que descrevem o que o Google informou, sem interpretar.
 *
 * "Sem site informado no Google" e não "sem site": a empresa pode ter site e
 * não ter cadastrado no perfil. "Parece celular" e não "WhatsApp": o formato do
 * número não diz se há WhatsApp nele.
 */
export default function SinaisDaEmpresa({ empresa }: { empresa: EmpresaEncontrada }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ehOportunidade(empresa) && (
        <span className="etiqueta-verde" title={`Critério: ${CRITERIO_OPORTUNIDADE}`}>
          <Icone nome="alvo" className="size-3.5" />
          Oportunidade
          <span className="sr-only">. Critério: {CRITERIO_OPORTUNIDADE}</span>
        </span>
      )}
      {!empresa.site && <span className="etiqueta-alerta">Sem site informado no Google</span>}
      {empresa.telefone ? (
        <span className="etiqueta-neutra">
          Telefone disponível{pareceCelular(empresa.telefone) ? " · parece celular" : ""}
        </span>
      ) : (
        <span className="etiqueta-neutra">Sem telefone no Google</span>
      )}
    </div>
  );
}
