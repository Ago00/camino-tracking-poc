# POC de tracking — Camino de Santi(ago)

> **Objetivo:** validar, **andando**, la cadena de tracking, con una mini-app de **trayectos**:
> OwnTracks (iPhone) → endpoint (con token) → Supabase → web que permite **iniciar/finalizar trayectos con nombre**,
> pinta sus **puntos unidos en el mapa**, deja ver el **detalle de cada punto** y muestra **estadísticas** (tiempo, distancia, velocidad media).
>
> **Es una POC desechable.** Prioriza que funcione; no es la arquitectura final. Apta para implementar con un modelo barato siguiendo este documento.

## Alcance (lo que la POC debe hacer)
1. **Trayectos con nombre**: iniciar un trayecto (dándole nombre) y finalizarlo. Puede haber **N trayectos registrados**, cada uno con su nombre y fechas.
2. **Ingesta**: mientras hay un trayecto **activo**, los puntos que manda OwnTracks se guardan asociados a ese trayecto. Sin trayecto activo, se ignoran.
3. **Mapa**: pinta los puntos del trayecto seleccionado **unidos por una línea** (traza), con el último resaltado.
4. **Detalle de punto**: al pulsar un punto, ver **coordenadas, hora y batería** (y precisión si hay).
5. **Estadísticas** del trayecto: **tiempo de trayecto**, **distancia** y **velocidad media**.
6. **Asiduidad configurable desde la web**: un ajuste en la UI para elegir **cada cuánto se refresca/pinta** el mapa (p. ej. 5/10/15/30/60 s). Persistente en el navegador.

## Decisiones (por defecto)
- **App:** OwnTracks (iOS), modo HTTP.
- **Cuentas:** Supabase + Vercel (crear si no existen). MapTiler **no** en la POC.
- **Mapa:** MapLibre GL + **tiles gratis** CARTO Voyager (sin key).
- **Auth del endpoint:** token secreto en la query (`?t=...`). Suficiente para POC.
- **Un solo trayecto activo a la vez.**

## Stack
Next.js (App Router, TypeScript) + `@supabase/supabase-js` + `maplibre-gl`. Deploy en Vercel.
Ubicación del código: `C:\Users\santi\proyectos\camino\` (app Next mínima; se reemplazará al montar la v1 real).

## Variables de entorno
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo servidor, nunca al cliente
TRACK_TOKEN=<cadena larga aleatoria>   # secreto del endpoint de ingesta
```

## Base de datos (Supabase) — SQL
```sql
create table if not exists trayectos (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,                     -- null = activo
  created_at  timestamptz not null default now()
);

create table if not exists posiciones (
  id          bigint generated always as identity primary key,
  trayecto_id bigint references trayectos(id) on delete cascade,
  lat         double precision not null,
  lon         double precision not null,
  ts          timestamptz not null,            -- hora del dispositivo
  batt        int,                             -- % batería (OwnTracks)
  acc         real,                            -- precisión en metros
  fuente      text not null default 'app',     -- 'app' | 'manual'
  created_at  timestamptz not null default now()
);
create index if not exists posiciones_tray_ts_idx on posiciones (trayecto_id, ts asc);

-- Solo puede haber un trayecto activo (ended_at null) a la vez:
create unique index if not exists un_trayecto_activo on trayectos ((ended_at is null)) where ended_at is null;

-- RLS activado; sin políticas públicas. Acceso solo server-side con service role key.
alter table trayectos  enable row level security;
alter table posiciones enable row level security;
```

## Endpoints

### `POST /api/track` — ingesta desde OwnTracks
OwnTracks (modo HTTP) hace **POST** con JSON:
```json
{ "_type": "location", "lat": 42.4310, "lon": -8.6446, "tst": 1725960000, "batt": 87, "acc": 12, "tid": "SA" }
```
Lógica:
1. `t` de la query vs `TRACK_TOKEN`. Si no coincide → `401`.
2. Si `_type !== "location"` o `lat`/`lon` no numéricos → `200` con `[]` (ignorar).
3. Buscar el **trayecto activo** (`ended_at is null`). Si no hay → `200` con `[]` (no guardar).
4. Insertar en `posiciones` con `trayecto_id` del activo, `ts = to_timestamp(tst)`, `batt`, `acc`, `fuente='app'`.
5. Responder `200` con `[]`.
- Runtime **Node** (para el cliente Supabase con service key).

### `POST /api/trayectos/start` — iniciar trayecto
Body `{ "nombre": "Prueba paseo 1" }`. Crea un trayecto activo. Si ya hay uno activo → `409`. Devuelve el trayecto creado.

### `POST /api/trayectos/finish` — finalizar
Pone `ended_at = now()` en el trayecto activo. Si no hay activo → `409`.

### `GET /api/trayectos` — lista
Devuelve todos los trayectos (id, nombre, started_at, ended_at, activo, nº de puntos), orden `started_at desc`.

### `GET /api/trayectos/[id]` — detalle
Devuelve el trayecto + sus puntos (`ts asc`) + estadísticas calculadas:
```json
{
  "trayecto": { "id": 1, "nombre": "Prueba paseo 1", "started_at": "...", "ended_at": null },
  "puntos": [{ "lat": 42.43, "lon": -8.64, "ts": "...", "batt": 87, "acc": 12 }, ...],
  "stats": { "duracionMin": 42.5, "distanciaKm": 3.21, "velocidadMediaKmh": 4.5 }
}
```
Lee de Supabase con service role key.

## Cálculo de estadísticas
- **Distancia** = suma de **haversine** entre puntos consecutivos (km):
  `d = 2R·asin(√(sin²(Δφ/2) + cosφ1·cosφ2·sin²(Δλ/2)))`, con `R = 6371 km`.
- **Tiempo de trayecto** = `(ended_at ?? now) − started_at`.
- **Tiempo en movimiento** = `ts(último punto) − ts(primer punto)` (para la velocidad).
- **Velocidad media** = `distanciaKm / horas_en_movimiento` (km/h). Si <2 puntos o tiempo 0 → `0` / "—".
- (Opcional POC) ignorar puntos con `acc` muy alta o saltos > umbral para no inflar la distancia. Si no, sumar todo.
Se puede calcular en el servidor (endpoint de detalle) o en el cliente; recomendado en el servidor.

## Página / UI — `GET /`
Client component con MapLibre GL. Base raster CARTO Voyager:
`https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png` (© OSM · © CARTO).

**Zona de control (arriba):**
- Si **no hay trayecto activo**: input de **nombre** + botón **"Iniciar trayecto"**.
- Si **hay activo**: nombre del activo + botón **"Finalizar trayecto"** + stats en vivo.
- **Selector de trayecto**: lista de los N trayectos (nombre + fecha); al elegir uno se carga en el mapa.
- **Ajuste de asiduidad**: desplegable (5/10/15/30/60 s) que controla cada cuánto se refresca el mapa. Persistir en `localStorage`.

**Mapa:**
- Dibuja los puntos del trayecto seleccionado **unidos por una línea** + último punto resaltado.
- `fitBounds` a los puntos la primera carga.
- **Al pulsar un punto** → popup con **coordenadas (lat, lon), hora y batería** (y precisión).
- Refresco: cada `asiduidad` segundos vuelve a pedir el detalle del trayecto activo/seleccionado y repinta.

**Panel de estadísticas** (del trayecto mostrado): **tiempo**, **distancia (km)**, **velocidad media (km/h)**, nº de puntos y "última señal hace X".
Estado vacío: "Inicia un trayecto y empieza a andar…".

## Despliegue (Vercel)
1. `git init` en `camino/`, subir a GitHub.
2. Importar en Vercel. 3 env vars en Production.
3. Deploy → URL pública `https://<app>.vercel.app`.

## Operativa OwnTracks (iPhone) — para Santi
1. Instalar **OwnTracks**. Permisos de ubicación: **Siempre**.
2. Ajustes → **Mode: HTTP**.
3. **URL**: `https://<app>.vercel.app/api/track?t=<TRACK_TOKEN>`
4. **DeviceID/TrackerID**: `santi` / `SA`.
5. Para la prueba, **modo Move** (envíos frecuentes) o intervalo ~30-60 s.
6. En la web: **Iniciar trayecto** (nómbralo) → salir a andar → ver puntos, traza y stats → **Finalizar** al volver.
   *(Nota: la "asiduidad" de la web es cada cuánto REFRESCA el mapa; cada cuánto ENVÍA el móvil se ajusta en OwnTracks.)*

## Checklist de implementación (para el modelo ejecutor)
1. [ ] Scaffold Next.js (App Router, TS) en `camino/`.
2. [ ] Instalar `@supabase/supabase-js` y `maplibre-gl`.
3. [ ] Crear tablas en Supabase (SQL de arriba, incluido el índice de único-activo).
4. [ ] `lib/supabase.ts`: cliente service role (solo server).
5. [ ] `app/api/track/route.ts`: token + buscar activo + insert.
6. [ ] `app/api/trayectos/start` y `/finish` (POST) y `GET /api/trayectos`.
7. [ ] `app/api/trayectos/[id]/route.ts`: detalle + stats (haversine, duración, velocidad).
8. [ ] `app/page.tsx` + componente mapa: control de trayecto (iniciar/finalizar), selector, ajuste de asiduidad (localStorage), traza unida, popup de detalle por punto, panel de stats, polling.
9. [ ] `.env.local` de ejemplo + documentar env vars.
10. [ ] Probar en local con `curl` simulando un POST de OwnTracks (con un trayecto activo).
11. [ ] Deploy a Vercel + env vars.
12. [ ] Configurar OwnTracks y **validar andando** (iniciar → andar → ver traza/stats → finalizar).

## Criterio de éxito
Santi **inicia un trayecto con nombre**, anda un rato, y en la web ve **los puntos unidos en el mapa**, puede **pulsar un punto** y ver sus datos, ve **tiempo/distancia/velocidad media** actualizándose, ajusta la **asiduidad** del refresco, y **finaliza** el trayecto — que queda registrado junto a los demás.

## Qué NO incluye la POC (a propósito)
Proyección sobre traza fija / progreso hacia Santiago, formularios, intenciones/comentarios, panel de admin completo, privacidad/RLS pública, MapTiler, diseño "pro". Eso es v1.1.
```
