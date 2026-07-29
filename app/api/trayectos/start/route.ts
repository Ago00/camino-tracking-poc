import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";

  if (!nombre) {
    return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("trayectos")
    .insert({ nombre })
    .select()
    .single();

  if (error) {
    // 23505 = violación del índice único de trayecto activo (ver SQL en docs/POC-tracking.md)
    if (error.code === "23505") {
      return NextResponse.json({ error: "ya hay un trayecto activo" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
