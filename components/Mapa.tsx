"use client";

import { useEffect, useRef } from "react";
import { MapLibreMap, LngLatBounds, Marker, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Punto } from "@/lib/types";

const TILES_VOYAGER = [
  "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
];

const CAPA_LINEA = "traza-linea";

function crearElementoPunto(esUltimo: boolean): HTMLDivElement {
  const el = document.createElement("div");
  const tamano = esUltimo ? 26 : 18;
  el.style.width = `${tamano}px`;
  el.style.height = `${tamano}px`;
  el.style.borderRadius = "50%";
  el.style.background = esUltimo ? "#D9773B" : "#2F5D50";
  el.style.border = "3px solid #ffffff";
  el.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
  el.style.cursor = "pointer";
  return el;
}

function lineaAGeoJSON(puntos: Punto[]) {
  // Un LineString necesita al menos 2 posiciones; con menos, GeoJSON invalido.
  const coordinates = puntos.length >= 2 ? puntos.map((p) => [p.lon, p.lat]) : [];
  return {
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates },
    properties: {},
  };
}

type Props = {
  puntos: Punto[];
  onSeleccionarPunto: (punto: Punto) => void;
};

export default function Mapa({ puntos, onSeleccionarPunto }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapLibreMap | null>(null);
  const cargadoRef = useRef(false);
  const primerFitDoneRef = useRef(false);
  const onSeleccionarPuntoRef = useRef(onSeleccionarPunto);
  onSeleccionarPuntoRef.current = onSeleccionarPunto;
  const puntosRef = useRef(puntos);
  puntosRef.current = puntos;
  const marcadoresRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!contenedorRef.current) return;

    const mapa = new MapLibreMap({
      container: contenedorRef.current,
      style: {
        version: 8,
        sources: {
          "carto-voyager": {
            type: "raster",
            tiles: TILES_VOYAGER,
            tileSize: 256,
            attribution: "© OpenStreetMap contributors © CARTO",
          },
        },
        layers: [
          { id: "carto-voyager", type: "raster", source: "carto-voyager" },
        ],
      },
      center: [-8.6446, 42.431],
      zoom: 12,
    });
    mapaRef.current = mapa;

    mapa.on("load", () => {
      mapa.addSource("linea", {
        type: "geojson",
        data: lineaAGeoJSON([]),
      });

      mapa.addLayer({
        id: CAPA_LINEA,
        type: "line",
        source: "linea",
        paint: { "line-color": "#3B357A", "line-width": 3 },
      });

      cargadoRef.current = true;
      // Usa la ref, no el "puntos" capturado al montar: para cuando "load"
      // termina (asincrono), ya puede haber datos mas recientes.
      actualizarDatos(puntosRef.current);
    });

    return () => {
      mapa.remove();
      mapaRef.current = null;
      cargadoRef.current = false;
      primerFitDoneRef.current = false;
    };
  }, []);

  function actualizarDatos(puntosActuales: Punto[]) {
    const mapa = mapaRef.current;
    if (!mapa || !cargadoRef.current) return;

    const fuenteLinea = mapa.getSource("linea") as GeoJSONSource | undefined;
    fuenteLinea?.setData(lineaAGeoJSON(puntosActuales));

    marcadoresRef.current.forEach((m) => m.remove());
    marcadoresRef.current = puntosActuales.map((punto, i) => {
      const esUltimo = i === puntosActuales.length - 1;
      const el = crearElementoPunto(esUltimo);
      el.addEventListener("click", () => onSeleccionarPuntoRef.current(punto));
      return new Marker({ element: el }).setLngLat([punto.lon, punto.lat]).addTo(mapa);
    });

    if (puntosActuales.length > 0 && !primerFitDoneRef.current) {
      const bounds = puntosActuales.reduce(
        (b, p) => b.extend([p.lon, p.lat]),
        new LngLatBounds(
          [puntosActuales[0].lon, puntosActuales[0].lat],
          [puntosActuales[0].lon, puntosActuales[0].lat]
        )
      );
      mapa.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 0 });
      primerFitDoneRef.current = true;
    }
  }

  useEffect(() => {
    actualizarDatos(puntos);
  }, [puntos]);

  return <div ref={contenedorRef} style={{ width: "100%", height: "100%" }} />;
}
