"use client";

import { useEffect, useRef } from "react";
import {
  MapLibreMap,
  LngLatBounds,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Punto } from "@/lib/types";

const TILES_VOYAGER = [
  "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
];

const FUENTE_TRAZA = "traza";
const CAPA_LINEA = "traza-linea";
const CAPA_PUNTOS = "traza-puntos";
const CAPA_ULTIMO = "traza-ultimo";

function puntosAGeoJSON(puntos: Punto[]) {
  return {
    type: "FeatureCollection" as const,
    features: puntos.map((p, i) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
      properties: { ...p, esUltimo: i === puntos.length - 1 },
    })),
  };
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
      mapa.addSource(FUENTE_TRAZA, {
        type: "geojson",
        data: puntosAGeoJSON([]),
      });
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

      mapa.addLayer({
        id: CAPA_PUNTOS,
        type: "circle",
        source: FUENTE_TRAZA,
        filter: ["!=", ["get", "esUltimo"], true],
        paint: {
          "circle-radius": 5,
          "circle-color": "#2F5D50",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      mapa.addLayer({
        id: CAPA_ULTIMO,
        type: "circle",
        source: FUENTE_TRAZA,
        filter: ["==", ["get", "esUltimo"], true],
        paint: {
          "circle-radius": 8,
          "circle-color": "#D9773B",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      const alClicarPunto = (e: MapLayerMouseEvent) => {
        const props = e.features?.[0]?.properties;
        if (props) onSeleccionarPuntoRef.current(props as unknown as Punto);
      };
      mapa.on("click", CAPA_PUNTOS, alClicarPunto);
      mapa.on("click", CAPA_ULTIMO, alClicarPunto);
      [CAPA_PUNTOS, CAPA_ULTIMO].forEach((capa) => {
        mapa.on("mouseenter", capa, () => {
          mapa.getCanvas().style.cursor = "pointer";
        });
        mapa.on("mouseleave", capa, () => {
          mapa.getCanvas().style.cursor = "";
        });
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

    const fuentePuntos = mapa.getSource(FUENTE_TRAZA) as GeoJSONSource | undefined;
    const fuenteLinea = mapa.getSource("linea") as GeoJSONSource | undefined;
    fuentePuntos?.setData(puntosAGeoJSON(puntosActuales));
    fuenteLinea?.setData(lineaAGeoJSON(puntosActuales));

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
