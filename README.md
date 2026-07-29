# Camino de Santi(ago) — POC de tracking

POC desechable para validar la cadena de tracking (OwnTracks → endpoint → Supabase → web con mapa)
del proyecto [Camino de Santi(ago)](docs/ESPECIFICACION-v1.md). Diseño completo en [docs/POC-tracking.md](docs/POC-tracking.md).

## Variables de entorno

Copia `.env.local.example` a `.env.local` y rellena:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo servidor, nunca al cliente
TRACK_TOKEN=...                 # secreto del endpoint de ingesta
```

## Base de datos

Ejecutar el SQL de `docs/POC-tracking.md` (tablas `trayectos` y `posiciones`) en el SQL Editor de Supabase.

## Desarrollo local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Simular un envío de OwnTracks

Con un trayecto activo (créalo desde la web), simula un punto GPS:

```bash
curl -X POST "http://localhost:3000/api/track?t=<TRACK_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"_type":"location","lat":42.4310,"lon":-8.6446,"tst":1725960000,"batt":87,"acc":12,"tid":"SA"}'
```

## Deploy

Importar el repo en Vercel y configurar las 3 env vars en Production. Ver operativa de OwnTracks en `docs/POC-tracking.md`.
