export function formatDuracion(minutos: number): string {
  const totalMin = Math.round(minutos);
  const horas = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (horas === 0) return `${min} min`;
  return `${horas} h ${min} min`;
}

export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatHaceCuanto(iso: string): string {
  const segundos = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.round(minutos / 60);
  return `${horas} h`;
}
