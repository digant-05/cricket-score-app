"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Scorecard } from "../../../components/Scorecard";
import { buildScorecard, type ScoreMatchInput } from "../../../lib/scorecard";
export default function MatchScorecardPage() {
  const params = useParams<{id:string}>(); const [match, setMatch] = useState<ScoreMatchInput | null>(null); const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/data?view=public&id=${encodeURIComponent(params.id)}`, { cache: "no-store" }).then(async response => { if (!response.ok) throw new Error("Could not load the scorecard."); const data = await response.json(); if (!data) throw new Error("This match could not be found."); setMatch(data); }).catch(e => setError(e.message)); }, [params.id]);
  return <main className="site-shell"><header className="site-header"><a href="/" className="brand">boundary<span className="brand-dot">.</span><small>THE SCOREKEEPER</small></a><a href="/">← All matches</a></header>{match ? <Scorecard match={buildScorecard(match)} /> : <section className="panel empty-state">{error || "Loading scorecard…"}</section>}</main>;
}
