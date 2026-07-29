"use client";

import { useCallback, useEffect, useRef } from "react";
import { MapLibreMap, LngLatBounds, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Punto } from "@/lib/types";

const TILES_VOYAGER = [
  "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
];

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

type Props = {
  puntos: Punto[];
  onSeleccionarPunto: (punto: Punto) => void;
};

export default function Mapa({ puntos, onSeleccionarPunto }: Props) {
  const mapaContenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapLibreMap | null>(null);
  const cargadoRef = useRef(false);
  const primerFitDoneRef = useRef(false);
  const onSeleccionarPuntoRef = useRef(onSeleccionarPunto);
  const puntosRef = useRef(puntos);
  const marcadoresRef = useRef<Marker[]>([]);
  const polylineRef = useRef<SVGPolylineElement>(null);

  useEffect(() => {
    onSeleccionarPuntoRef.current = onSeleccionarPunto;
  }, [onSeleccionarPunto]);

  useEffect(() => {
    puntosRef.current = puntos;
  }, [puntos]);

  const actualizarLinea = useCallback(() => {
    const mapa = mapaRef.current;
    const polyline = polylineRef.current;
    if (!mapa || !polyline) return;

    const puntosActuales = puntosRef.current;
    if (puntosActuales.length < 2) {
      polyline.setAttribute("points", "");
      return;
    }

    const puntosProyectados = puntosActuales
      .map((p) => {
        const { x, y } = mapa.project([p.lon, p.lat]);
        return `${x},${y}`;
      })
      .join(" ");
    polyline.setAttribute("points", puntosProyectados);
  }, []);

  const actualizarDatos = useCallback(
    (puntosActuales: Punto[]) => {
      const mapa = mapaRef.current;
      if (!mapa || !cargadoRef.current) return;

      marcadoresRef.current.forEach((m) => m.remove());
      marcadoresRef.current = puntosActuales.map((punto, i) => {
        const esUltimo = i === puntosActuales.length - 1;
        const el = crearElementoPunto(esUltimo);
        el.addEventListener("click", () => onSeleccionarPuntoRef.current(punto));
        return new Marker({ element: el }).setLngLat([punto.lon, punto.lat]).addTo(mapa);
      });
      actualizarLinea();

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
    },
    [actualizarLinea]
  );

  useEffect(() => {
    if (!mapaContenedorRef.current) return;

    const mapa = new MapLibreMap({
      container: mapaContenedorRef.current,
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

    // La traza se dibuja con un overlay SVG (no con una capa GL "line"), que
    // se ha demostrado mas fiable entre entornos/navegadores. Se recalcula
    // en cada movimiento de camara para mantener los puntos proyectados.
    mapa.on("move", actualizarLinea);

    mapa.on("load", () => {
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
  }, [actualizarDatos, actualizarLinea]);

  useEffect(() => {
    actualizarDatos(puntos);
  }, [puntos, actualizarDatos]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapaContenedorRef} style={{ width: "100%", height: "100%" }} />
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <polyline
          ref={polylineRef}
          fill="none"
          stroke="#3B357A"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
