import type { Punto, Stats } from "@/lib/types";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: Punto, b: Punto): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function calcularStats(
  puntos: Punto[],
  startedAt: string,
  endedAt: string | null
): Stats {
  const finReferencia = endedAt ?? new Date().toISOString();
  const duracionMin =
    (new Date(finReferencia).getTime() - new Date(startedAt).getTime()) / 60000;

  if (puntos.length < 2) {
    return { duracionMin, distanciaKm: 0, velocidadMediaKmh: 0 };
  }

  let distanciaKm = 0;
  for (let i = 1; i < puntos.length; i++) {
    distanciaKm += haversineKm(puntos[i - 1], puntos[i]);
  }

  const horasEnMovimiento =
    (new Date(puntos[puntos.length - 1].ts).getTime() -
      new Date(puntos[0].ts).getTime()) /
    3600000;

  const velocidadMediaKmh =
    horasEnMovimiento > 0 ? distanciaKm / horasEnMovimiento : 0;

  return { duracionMin, distanciaKm, velocidadMediaKmh };
}
