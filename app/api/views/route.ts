import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

export const dynamic = "force-dynamic";
const ACTIVE_WINDOW_MS = 45_000;
const validId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9-]{16,80}$/.test(value);

async function counts() {
  const store = getStore("scoremitra-site-stats");
  const [views, viewers] = await Promise.all([
    store.list({ prefix: "views/" }),
    store.list({ prefix: "viewers/" }),
  ]);
  const now = Date.now();
  const active = await Promise.all(viewers.blobs.map(async blob => {
    const entry = await store.get(blob.key, { type: "json" }) as { lastSeen?: number } | null;
    if (!entry || typeof entry.lastSeen !== "number" || now - entry.lastSeen > ACTIVE_WINDOW_MS) {
      await store.delete(blob.key);
      return null;
    }
    return blob.key.slice("viewers/".length);
  }));
  return { totalViews: views.blobs.length, liveViewers: new Set(active.filter(Boolean)).size };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!validId(body?.visitorId) || (body.action === "visit" && !validId(body?.viewId)) || !["visit", "heartbeat"].includes(body?.action)) {
      return NextResponse.json({ error: "Invalid view event." }, { status: 400 });
    }
    const store = getStore("scoremitra-site-stats");
    if (body.action === "visit") await store.setJSON(`views/${body.viewId}`, { visitedAt: Date.now() }, { onlyIfNew: true });
    await store.setJSON(`viewers/${body.visitorId}`, { lastSeen: Date.now() });
    return NextResponse.json(await counts(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Netlify Blobs view stats failed", error);
    return NextResponse.json({ error: "View counts are temporarily unavailable." }, { status: 503 });
  }
}
