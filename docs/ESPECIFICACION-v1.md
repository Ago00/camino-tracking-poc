# Camino de Santi(ago) — Especificación v1

> Web para acompañar el reto de Santi: caminar **del tirón ~100 km del Camino Portugués**
> (O Porriño → Santiago, 24-30 h sin dormir), **ofrecido por intenciones**. Familia y amigos
> siguen su posición en directo, dejan intenciones/comentarios y viven la aventura.
>
> Estado: **fase de diseño terminada** (mockups aprobados en el design-sandbox). Siguiente: **POC de tracking**.
> Mockups: `design-sandbox/app/camino/` → web pública (`page.tsx` + `MapaReal.tsx`), `/camino/admin`, `/camino/logos`.

## Stack
- **Next.js + Supabase** (Postgres, Storage, Auth) + **Vercel**. Todo en planes gratis.
- Mapas: **MapTiler** (free tier) con **MapLibre GL**. Proyección con **Turf.js**.
- Tracking: **app de iPhone** (OwnTracks/Traccar) → endpoint propio.

## Fases
- **v1.0 — POC de tracking** (LO SIGUIENTE): cadena mínima móvil → endpoint → DB → punto en mapa. Validar andando.
- **v1.1 — v1 completa**: proyección/progreso, estadísticas, formularios con privacidad, panel admin.
- **v2**: minuto a minuto (directo), hitos automáticos, **bot de Telegram**, contador de seguidores.
- **Fuera de alcance**: vídeo, integración de Instagram (solo enlace).

## Modos de la web (campo `fase`)
`antes` (presentación + formularios) · `durante` (mapa + progreso + stats + formularios) · `llegada`
(conserva mapa+stats congeladas + mensaje de llegada; avisa de que terminó).

## Diseño (aprobado)
- **Dirección**: credencial de peregrino contemporánea. Sin cliché flecha-amarilla/concha-azul/crema.
- **Paleta**: granito `#F4F3EF`, tinta `#1B211D`, violeta litúrgico `#3B357A`, eucalipto `#2F5D50`,
  ámbar-brasa `#D9773B` (en directo), oro `#C9A24B` (llegada). Rojiblanco Atleti `#CE2029` en detalles.
- **Tipografía**: serif **Fraunces** (títulos) + cifras monoespaciadas (datos).
- **Nombre / juego**: "**Camino de Santi·ago**" ("…y este camino, ¡no lo hago solo!").
- **Logo elegido: S2** = mojón (placa azul + concha amarilla) + **monigote rojiblanco**
  (esfera-cara lista para meter la foto de Santi). Aplicado en el hero.
- **Ideas visuales**: hilo del Camino con scroll (se "anda" al bajar), **cielo-reloj** en el mapa
  (día→atardecer→noche estrellada→amanecer según hora real), **mojón** como cifra de km restantes,
  **peregrino** que pasea libre por la pantalla dejando huellas y que al pincharlo **se enfada**
  (cabeza roja hinchada, humo, bocadillo "!", anda rápido 3 s). Camiseta rojiblanca del Atleti.
- **Mapa**: MapLibre con base a color (Voyager en mockup → MapTiler en prod). Tocar para ampliar a
  pantalla completa. Traza + tramo andado encendido + posición. Modo "resumen" (ruta entera, sin
  posición) para la intro.

## Lógica de tracking (CERRADA)
- **Proyección sobre la traza con Turf** (una operación por punto): devuelve avance-a-lo-largo + separación de la ruta.
- **Barra / %** = avance *hacia Santiago* (componente proyectado sobre el plan), **monótono** (seguro anti-ruido).
- **Km caminados** = odómetro real (rodeos incluidos).
- **Km restantes** = separación de la ruta ("return-aware") + plan restante. Puede no sumar 100 con la barra: es correcto.
- **Desvíos**: pequeño → pinta sobre el plan; grande → pinta la traza real; al reenganchar, el tramo previsto saltado se da por avanzado.
- **Por cada punto guardar**: `lat, lon, timestamp, fuente (app|manual)`.
- Umbral "fuera de ruta"; rechazo de saltos imposibles (velocidad); **descartar último punto** (soft, reversible); corrección manual.
- **Traza**: única y fija, **O Porriño → Santiago (~100 km)**. La prepara Claude (Wikiloc/OSM), Santi valida. GeoJSON.
- **Lista de pueblos por km** (O Porriño 0 … Santiago 100): para "cerca de X" en el panel y para los hitos automáticos (v2).
- **ETA**: fuera (el ritmo baja con el cansancio y engañaría). **Ritmo**: medio global.

## Nombre del sitio
- **Público**: NO se muestra el pueblo por ahora. *Idea aparcada*: "Ahora: cerca de [pueblo]" en Durante vía geocodificación inversa de MapTiler.
- **Panel admin**: sí, "cerca de [pueblo] · km" desde la lista propia (gratis, sin API).

## Privacidad (crítica)
- **Intenciones**: anónimas o con nombre; **SIEMPRE privadas**; políticas RLS impiden leerlas desde la API pública; solo el panel las ve (server-side / service key).
- **Comentarios**: nunca anónimos (llevan nombre); el autor elige público/privado; en público solo se muestran los públicos y no ocultados.

## Panel de administración (v1, CERRADO)
- **Acceso**: URL propia y discreta + `noindex`, detrás de **contraseña única (env var) + cookie firmada HttpOnly**. Botón salir. (La URL oculta es solo capa extra; la cerradura es la contraseña.)
- **Actividad**: Iniciar (→ Durante, fija inicio) · Finalizar (→ Llegada, fija fin, con **mensaje de llegada** editable = sugerencia + confirmar) · **Volver a Antes** (confirmación fuerte).
- **Posición**: "fichar mi posición ahora" (geolocalización del navegador → **mismo endpoint** que la app) · ver última + "hace cuánto" + fuente · **descartar último punto**.
- **Intenciones**: leer / eliminar.
- **Comentarios**: ocultar / mostrar / eliminar + filtro (todos/públicos/ocultos).
- NO edita los textos de la web (solo opera). NO muestra resumen en vivo.
- **v2**: gestión del directo (editar/eliminar entradas del minuto a minuto y los hitos automáticos).

## Contador de seguidores (v2)
Nombre del visitante en `localStorage` + tabla de presencia → "ahora te siguen: Marta, Javi y 12 más". Tira discreta, no bloqueante.

## Pendientes (para retomar)
- Textos / copy finales de la web (aplazado).
- **Foto con luz** para la esfera-cara del monigote (la de atardecer salía oscura).
- Pulido "pro" del diseño con referencias que traerá Santi.
- **Traza real GPX** O Porriño → Santiago.
- Cuentas: **Supabase, Vercel, MapTiler**.

## POC de tracking (SIGUIENTE PASO)
Objetivo: validar que las coordenadas viajan del móvil al mapa, **probándolo andando**.
Cadena mínima: **app de iPhone** (OwnTracks/Traccar) → **endpoint** (con token secreto) → **Supabase** (tabla de posiciones) → **página que muestra el último punto en el mapa**.
Requisitos: cuentas Supabase + Vercel (endpoint accesible desde el móvil) + app instalada en el iPhone.
