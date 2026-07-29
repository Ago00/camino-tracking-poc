import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calcularStats } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/trayectos/[id]">
) {
  const { id } = await ctx.params;

  const { data: trayecto, error: errorTrayecto } = await supabaseAdmin
    .from("trayectos")
    .select("id, nombre, started_at, ended_at")
    .eq("id", id)
    .maybeSingle();

  if (errorTrayecto) {
    return NextResponse.json({ error: errorTrayecto.message }, { status: 500 });
  }
  if (!trayecto) {
    return NextResponse.json({ error: "trayecto no encontrado" }, { status: 404 });
  }

  const { data: puntos, error: errorPuntos } = await supabaseAdmin
    .from("posiciones")
    .select("lat, lon, ts, batt, acc")
    .eq("trayecto_id", id)
    .order("ts", { ascending: true });

  if (errorPuntos) {
    return NextResponse.json({ error: errorPuntos.message }, { status: 500 });
  }

  const stats = calcularStats(puntos ?? [], trayecto.started_at, trayecto.ended_at);

  return NextResponse.json({ trayecto, puntos: puntos ?? [], stats });
}
