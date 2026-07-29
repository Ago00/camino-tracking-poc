import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const { data: trayectos, error } = await supabaseAdmin
    .from("trayectos")
    .select("id, nombre, started_at, ended_at, posiciones(count)")
    .order("started_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resultado = trayectos.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    started_at: t.started_at,
    ended_at: t.ended_at,
    activo: t.ended_at === null,
    numPuntos: t.posiciones?.[0]?.count ?? 0,
  }));

  return NextResponse.json(resultado);
}
