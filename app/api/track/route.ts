import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function tokenValido(recibido: string | null): boolean {
  const esperado = process.env.TRACK_TOKEN ?? "";
  if (!recibido || !esperado) return false;

  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!tokenValido(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const lat = Number(body?.lat);
  const lon = Number(body?.lon);
  const tst = Number(body?.tst);

  if (body?._type !== "location" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json([]);
  }

  const { data: activo } = await supabaseAdmin
    .from("trayectos")
    .select("id")
    .is("ended_at", null)
    .maybeSingle();

  if (!activo) {
    return NextResponse.json([]);
  }

  const ts = Number.isFinite(tst) ? new Date(tst * 1000).toISOString() : new Date().toISOString();
  const batt = Number.isFinite(Number(body?.batt)) ? Number(body.batt) : null;
  const acc = Number.isFinite(Number(body?.acc)) ? Number(body.acc) : null;

  await supabaseAdmin.from("posiciones").insert({
    trayecto_id: activo.id,
    lat,
    lon,
    ts,
    batt,
    acc,
    fuente: "app",
  });

  return NextResponse.json([]);
}
