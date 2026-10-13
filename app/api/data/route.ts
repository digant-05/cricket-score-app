import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { authConfigured, isScorer } from "../../../lib/auth";
export const dynamic = "force-dynamic";
const empty = { matches: [], teams: [] };
async function readData() { const store = getStore("boundary-cricket"); return (await store.get("app-data", { type: "json" })) || empty; }
export async function GET(request: Request) {
  const url = new URL(request.url); const publicView = url.searchParams.get("view") === "public";
  if (!publicView && authConfigured() && !(await isScorer())) return NextResponse.json({ error: "Scorer login required." }, { status: 401 });
  try { const data: any = await readData(); const matches = Array.isArray(data.matches) ? data.matches : []; const id = url.searchParams.get("id"); return NextResponse.json(publicView ? (id ? (matches.find((m: any) => m.id === id) || null) : matches) : data); }
  catch (error) { console.error("Netlify Blobs read failed", error); return NextResponse.json({ error: "Shared storage is unavailable. Deploy this app to Netlify to enable it." }, { status: 503 }); }
}
export async function PUT(request: Request) {
  if (authConfigured() && !(await isScorer())) return NextResponse.json({ error: "Scorer login required." }, { status: 401 });
  try { const data = await request.json(); if (!Array.isArray(data.matches) || !Array.isArray(data.teams)) return NextResponse.json({ error: "Invalid match data." }, { status: 400 }); await getStore("boundary-cricket").setJSON("app-data", data); return NextResponse.json({ saved: true }); }
  catch (error) { console.error("Netlify Blobs write failed", error); return NextResponse.json({ error: "Shared storage is unavailable. Deploy this app to Netlify to enable it." }, { status: 503 }); }
}
