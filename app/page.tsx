"use client";

import { useCallback, useEffect, useState } from "react";
import Mapa from "@/components/Mapa";
import { formatDuracion, formatFecha, formatHaceCuanto } from "@/lib/format";
import type { Punto, TrayectoDetalle, TrayectoResumen } from "@/lib/types";

const OPCIONES_ASIDUIDAD = [5, 10, 15, 30, 60];
const CLAVE_ASIDUIDAD = "camino:asiduidad";

export default function Home() {
  const [trayectos, setTrayectos] = useState<TrayectoResumen[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<TrayectoDetalle | null>(null);
  const [puntoActivo, setPuntoActivo] = useState<Punto | null>(null);
  const [puntoActivoParaId, setPuntoActivoParaId] = useState<number | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [asiduidad, setAsiduidad] = useState(() => {
    if (typeof window === "undefined") return 15;
    const guardada = Number(localStorage.getItem(CLAVE_ASIDUIDAD));
    return OPCIONES_ASIDUIDAD.includes(guardada) ? guardada : 15;
  });
  const [error, setError] = useState<string | null>(null);
  const [cargandoAccion, setCargandoAccion] = useState(false);

  // El popup de detalle de punto es propio de cada trayecto: al cambiar de
  // selección se descarta durante el render (sin efecto), siguiendo el patrón
  // de React para ajustar estado derivado de otro estado.
  if (seleccionadoId !== puntoActivoParaId) {
    setPuntoActivoParaId(seleccionadoId);
    setPuntoActivo(null);
  }

  function cambiarAsiduidad(segundos: number) {
    setAsiduidad(segundos);
    localStorage.setItem(CLAVE_ASIDUIDAD, String(segundos));
  }

  const cargarTrayectos = useCallback(async () => {
    const res = await fetch("/api/trayectos");
    if (!res.ok) {
      setError("No se pudo cargar la lista de trayectos");
      return null;
    }
    const data: TrayectoResumen[] = await res.json();
    setTrayectos(data);
    return data;
  }, []);

  const cargarDetalle = useCallback(async (id: number) => {
    const res = await fetch(`/api/trayectos/${id}`);
    if (!res.ok) return;
    const data: TrayectoDetalle = await res.json();
    setDetalle(data);
  }, []);

  // Carga inicial: selecciona el trayecto activo si existe, si no el más reciente.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch de arranque, no hay otra forma de poblar la selección inicial
    cargarTrayectos().then((data) => {
      if (!data || data.length === 0) return;
      const activo = data.find((t) => t.activo);
      setSeleccionadoId(activo ? activo.id : data[0].id);
    });
  }, [cargarTrayectos]);

  useEffect(() => {
    if (seleccionadoId === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch de detalle al cambiar de trayecto seleccionado
    cargarDetalle(seleccionadoId);
  }, [seleccionadoId, cargarDetalle]);

  useEffect(() => {
    if (seleccionadoId === null) return;
    const intervalo = setInterval(() => {
      cargarDetalle(seleccionadoId);
    }, asiduidad * 1000);
    return () => clearInterval(intervalo);
  }, [seleccionadoId, asiduidad, cargarDetalle]);

  const trayectoActivo = trayectos.find((t) => t.activo) ?? null;

  async function iniciarTrayecto() {
    if (!nombreNuevo.trim()) return;
    setCargandoAccion(true);
    setError(null);
    try {
      const res = await fetch("/api/trayectos/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreNuevo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al iniciar el trayecto");
        return;
      }
      setNombreNuevo("");
      await cargarTrayectos();
      setSeleccionadoId(data.id);
    } finally {
      setCargandoAccion(false);
    }
  }

  async function finalizarTrayecto() {
    setCargandoAccion(true);
    setError(null);
    try {
      const res = await fetch("/api/trayectos/finish", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al finalizar el trayecto");
        return;
      }
      await cargarTrayectos();
      cargarDetalle(data.id);
    } finally {
      setCargandoAccion(false);
    }
  }

  const puntos = detalle?.puntos ?? [];
  const ultimoPunto = puntos[puntos.length - 1];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #ddd",
        }}
      >
        <strong>Camino de Santi(ago) — POC tracking</strong>

        {trayectoActivo ? (
          <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            Activo: <strong>{trayectoActivo.nombre}</strong>
            <button onClick={finalizarTrayecto} disabled={cargandoAccion}>
              Finalizar trayecto
            </button>
          </span>
        ) : (
          <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              placeholder="Nombre del trayecto"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && iniciarTrayecto()}
            />
            <button onClick={iniciarTrayecto} disabled={cargandoAccion || !nombreNuevo.trim()}>
              Iniciar trayecto
            </button>
          </span>
        )}

        <label style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          Trayecto:
          <select
            value={seleccionadoId ?? ""}
            onChange={(e) => setSeleccionadoId(Number(e.target.value))}
          >
            {trayectos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} — {formatFecha(t.started_at)}
                {t.activo ? " (activo)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          Refresco cada:
          <select
            value={asiduidad}
            onChange={(e) => cambiarAsiduidad(Number(e.target.value))}
          >
            {OPCIONES_ASIDUIDAD.map((s) => (
              <option key={s} value={s}>
                {s}s
              </option>
            ))}
          </select>
        </label>

        {error && <span style={{ color: "#CE2029" }}>{error}</span>}
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, position: "relative" }}>
          {puntos.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#666",
              }}
            >
              Inicia un trayecto y empieza a andar…
            </div>
          ) : (
            <Mapa
              key={seleccionadoId}
              puntos={puntos}
              onSeleccionarPunto={setPuntoActivo}
            />
          )}

          {puntoActivo && (
            <div
              style={{
                position: "absolute",
                bottom: "1rem",
                left: "1rem",
                background: "white",
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "0.75rem 1rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <div>
                <strong>Coordenadas:</strong> {puntoActivo.lat.toFixed(5)},{" "}
                {puntoActivo.lon.toFixed(5)}
              </div>
              <div>
                <strong>Hora:</strong> {formatFecha(puntoActivo.ts)}
              </div>
              <div>
                <strong>Batería:</strong>{" "}
                {puntoActivo.batt !== null ? `${puntoActivo.batt}%` : "—"}
              </div>
              <div>
                <strong>Precisión:</strong>{" "}
                {puntoActivo.acc !== null ? `${puntoActivo.acc} m` : "—"}
              </div>
              <button onClick={() => setPuntoActivo(null)}>Cerrar</button>
            </div>
          )}
        </div>

        <aside
          style={{
            width: 260,
            borderLeft: "1px solid #ddd",
            padding: "1rem",
            overflowY: "auto",
          }}
        >
          <h3>Estadísticas</h3>
          {detalle ? (
            <ul style={{ listStyle: "none", display: "grid", gap: "0.5rem" }}>
              <li>
                <strong>Tiempo:</strong> {formatDuracion(detalle.stats.duracionMin)}
              </li>
              <li>
                <strong>Distancia:</strong> {detalle.stats.distanciaKm.toFixed(2)} km
              </li>
              <li>
                <strong>Vel. media:</strong>{" "}
                {puntos.length >= 2
                  ? `${detalle.stats.velocidadMediaKmh.toFixed(1)} km/h`
                  : "—"}
              </li>
              <li>
                <strong>Nº puntos:</strong> {puntos.length}
              </li>
              <li>
                <strong>Última señal:</strong>{" "}
                {ultimoPunto ? `hace ${formatHaceCuanto(ultimoPunto.ts)}` : "—"}
              </li>
            </ul>
          ) : (
            <p>Selecciona un trayecto.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
