export type Punto = {
  lat: number;
  lon: number;
  ts: string;
  batt: number | null;
  acc: number | null;
};

export type Stats = {
  duracionMin: number;
  distanciaKm: number;
  velocidadMediaKmh: number;
};

export type TrayectoResumen = {
  id: number;
  nombre: string;
  started_at: string;
  ended_at: string | null;
  activo: boolean;
  numPuntos: number;
};

export type Trayecto = {
  id: number;
  nombre: string;
  started_at: string;
  ended_at: string | null;
};

export type TrayectoDetalle = {
  trayecto: Trayecto;
  puntos: Punto[];
  stats: Stats;
};
