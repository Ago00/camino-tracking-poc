import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST() {
  const { data, error } = await supabaseAdmin
    .from("trayectos")
    .update({ ended_at: new Date().toISOString() })
    .is("ended_at", null)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "no hay trayecto activo" }, { status: 409 });
  }

  return NextResponse.json(data);
}
