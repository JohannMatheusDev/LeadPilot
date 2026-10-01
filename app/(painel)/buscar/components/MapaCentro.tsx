"use client";

import { useEffect, useRef, useState } from "react";
import type { Centro } from "../../../lib/places";

/**
 * Mapa para escolher o centro da busca com um clique.
 *
 * Carrega o Maps JavaScript API direto do Google, sem pacote npm: o que se usa
 * é um mapa, um círculo e um clique, e os tipos mínimos estão declarados aqui
 * embaixo. A chave é a do NAVEGADOR (restrita por domínio), nunca a do Places
 * que roda no servidor.
 *
 * O mapa é do Google de propósito: os termos da Places API exigem que, se os
 * dados forem mostrados sobre um mapa, o mapa seja Google.
 */

type LatLngEvento = { latLng?: { lat(): number; lng(): number } | null };
type MapaGoogle = {
  addListener(evento: "click", fn: (e: LatLngEvento) => void): unknown;
  panTo(p: { lat: number; lng: number }): void;
  setZoom(z: number): void;
};
type CirculoGoogle = {
  setCenter(p: { lat: number; lng: number }): void;
  setRadius(m: number): void;
  setMap(m: MapaGoogle | null): void;
};
type BibliotecaMaps = {
  Map: new (el: HTMLElement, opcoes: Record<string, unknown>) => MapaGoogle;
  Circle: new (opcoes: Record<string, unknown>) => CirculoGoogle;
};
type JanelaComGoogle = Window & {
  google?: { maps?: { importLibrary?: (nome: string) => Promise<unknown> } };
  __leadpilotMapaPronto?: () => void;
};

let carregamento: Promise<BibliotecaMaps> | null = null;

// Uma única tag de script por página: o Maps reclama (e cobra) se for
// carregado duas vezes, o que aconteceria a cada vez que a tela remonta.
function carregarMaps(chave: string): Promise<BibliotecaMaps> {
  carregamento ??= new Promise<void>((resolver, rejeitar) => {
    const janela = window as JanelaComGoogle;
    if (janela.google?.maps?.importLibrary) return resolver();
    janela.__leadpilotMapaPronto = () => resolver();
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: chave,
      v: "weekly",
      loading: "async",
      callback: "__leadpilotMapaPronto",
      language: "pt-BR",
      region: "BR",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      carregamento = null;
      rejeitar(new Error("maps"));
    };
    document.head.appendChild(script);
  }).then(() => (window as JanelaComGoogle).google!.maps!.importLibrary!("maps") as Promise<BibliotecaMaps>);
  return carregamento;
}

// Centro geográfico aproximado do Brasil, para o primeiro enquadramento.
const BRASIL = { lat: -14.2, lng: -51.9 };

export default function MapaCentro({
  chave,
  centro,
  raioKm,
  onEscolher,
}: {
  chave: string;
  centro: Centro | null;
  raioKm: number | null;
  onEscolher: (c: Centro) => void;
}) {
  const elemento = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaGoogle | null>(null);
  const circulo = useRef<CirculoGoogle | null>(null);
  const escolher = useRef(onEscolher);
  const enquadrado = useRef(false);
  const [falhou, setFalhou] = useState(false);
  // Avisa o efeito do círculo que o mapa existe; sem isso, um centro escolhido
  // antes do script terminar de carregar nunca seria desenhado.
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    escolher.current = onEscolher;
  }, [onEscolher]);

  useEffect(() => {
    let ativo = true;
    carregarMaps(chave)
      .then(({ Map, Circle }) => {
        if (!ativo || !elemento.current || mapa.current) return;
        mapa.current = new Map(elemento.current, {
          center: BRASIL,
          zoom: 4,
          colorScheme: "DARK",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: "cooperative",
        });
        circulo.current = new Circle({
          strokeColor: "#34d399",
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: "#34d399",
          fillOpacity: 0.12,
          clickable: false,
        });
        mapa.current.addListener("click", (e) => {
          if (!e.latLng) return;
          escolher.current({ latitude: e.latLng.lat(), longitude: e.latLng.lng() });
        });
        setPronto(true);
      })
      .catch(() => ativo && setFalhou(true));
    return () => {
      ativo = false;
    };
  }, [chave]);

  // Redesenha o círculo quando muda o centro ou o raio. Sem raio, um círculo
  // pequeno marca só o ponto escolhido.
  useEffect(() => {
    const c = circulo.current;
    const m = mapa.current;
    if (!c || !m) return;
    if (!centro) {
      c.setMap(null);
      return;
    }
    const ponto = { lat: centro.latitude, lng: centro.longitude };
    c.setCenter(ponto);
    c.setRadius((raioKm ?? 0.15) * 1000);
    c.setMap(m);
    m.panTo(ponto);
    // Aproxima só na primeira vez; depois disso o zoom é de quem está usando.
    if (!enquadrado.current) {
      m.setZoom(13);
      enquadrado.current = true;
    }
  }, [centro, raioKm, pronto]);

  if (falhou) {
    return (
      <p className="rounded-xl border border-borda bg-fundo p-4 text-sm text-texto-suave">
        Não foi possível carregar o mapa. Confira a chave do navegador e se o Maps JavaScript API está ativado. Você
        ainda pode usar sua localização ou buscar pela cidade.
      </p>
    );
  }

  return (
    <div
      ref={elemento}
      role="application"
      aria-label="Mapa: clique para marcar o centro da busca"
      className="h-64 w-full overflow-hidden rounded-xl border border-borda bg-fundo sm:h-80"
    />
  );
}
