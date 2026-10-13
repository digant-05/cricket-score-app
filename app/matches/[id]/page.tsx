"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PublicMatchView from "../../../components/PublicMatchView";
import type { ScoreMatchInput } from "../../../lib/scorecard";
export default function MatchScorecardPage() {
  const params = useParams<{id:string}>(); const [match, setMatch] = useState<ScoreMatchInput | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; let loadedOnce = false; const load = async () => { try { const response = await fetch(`/api/data?view=public&id=${encodeURIComponent(params.id)}`, { cache: "no-store" }); if (!response.ok) throw new Error("Could not load the scorecard."); const data = await response.json(); if (!data) throw new Error("This match could not be found."); if (active) { setMatch(data); setError(""); loadedOnce = true; } } catch (e) { if (active && !loadedOnce) setError(e instanceof Error ? e.message : "Could not load the scorecard."); } }; void load(); const timer = setInterval(load, 3000); return () => { active = false; clearInterval(timer); }; }, [params.id]);
  return <main className="site-shell"><header className="site-header"><a href="/" className="brand"><span className="brand-mark">b</span>boundary<span className="brand-dot">.</span><small>THE SCOREKEEPER</small></a><a href="/">← All matches</a></header>{match ? <PublicMatchView match={match} /> : <section className="panel empty-state">{error || "Loading scorecard…"}</section>}</main>;
}
