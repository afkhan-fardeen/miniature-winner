import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Exchanges the emailed code (signup confirmation, password reset) for a session. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const raw = url.searchParams.get("next") ?? "/app";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/app";
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("That link is invalid or has expired."), url.origin));
}
