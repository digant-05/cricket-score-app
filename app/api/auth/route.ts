import { NextResponse } from "next/server";
import { authConfigured, isScorer, issueSession, scorerCookie } from "../../../lib/auth";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ configured: authConfigured(), authenticated: await isScorer() }); }
export async function POST(request: Request) {
  if (!authConfigured()) return NextResponse.json({ error: "Scorer login is not configured on this deployment." }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || body.password !== process.env.SCORER_PASSWORD) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(scorerCookie, issueSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 7 * 24 * 60 * 60 });
  return response;
}
export async function DELETE() { const response = NextResponse.json({ authenticated: false }); response.cookies.set(scorerCookie, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 }); return response; }
