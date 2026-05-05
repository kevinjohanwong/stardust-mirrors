import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) ?? "NOT SET",
    anon_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
