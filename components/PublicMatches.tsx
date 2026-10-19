"use client";
import { useEffect, useState } from "react";
import { TournamentTable, type Tournament } from "./TournamentManager";
import type { PerformanceBall } from "../lib/player-performance";

type Match = {
  id: string;
  createdAt: string;
  scheduledAt?: string;
  teams: [string, string];
  squads?: [string[], string[]];
  innings: { batting: string; runs: number; wickets: number; legal: number; superOver?: number; balls: PerformanceBall[] }[];
  oversLimit: number;
  status: "upcoming" | "live" | "innings-break" | "complete";
  tournamentId?: string;
  playerOfMatch?: string;
};
type Filter = "all" | "live" | "upcoming" | "complete";
const overs = (n: number) => `${Math.floor(n / 6)}.${n % 6}`;

export default function PublicMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  async function refresh() {
    try {
      const response = await fetch("/api/data?view=public", { cache: "no-store" });
      if (!response.ok) throw new Error("Shared match list will appear after the app is deployed to Netlify.");
      const list = await response.json();
      setMatches(Array.isArray(list) ? list : []);
      const tournamentResponse = await fetch("/api/data?view=public&resource=tournaments", { cache: "no-store" });
      if (tournamentResponse.ok) { const competitionData = await tournamentResponse.json(); setTournaments(Array.isArray(competitionData.tournaments) ? competitionData.tournaments : []); }
      setProblem("");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not load matches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  const live = matches.filter(match => match.status === "live" || match.status === "innings-break");
  const upcoming = matches.filter(match => match.status === "upcoming").sort((a, b) => (a.scheduledAt || a.createdAt).localeCompare(b.scheduledAt || b.createdAt));
  const completed = matches.filter(match => match.status === "complete").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const visible = filter === "live" ? live : filter === "upcoming" ? upcoming : filter === "complete" ? completed : [...live, ...upcoming, ...completed];
  const options: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All matches", count: matches.length },
    { id: "live", label: "Live", count: live.length },
    { id: "upcoming", label: "Upcoming", count: upcoming.length },
    { id: "complete", label: "Completed", count: completed.length },
  ];

  return <main className="site-shell">
    <header className="site-header"><a href="/" className="brand"><img className="brand-logo" src="/scoremitra-logo.png" alt="ScoreMitra Cricket Impact" /></a><a className="primary-btn" href="/scorer">SCORER LOGIN <span>→</span></a></header>
    <section className="hero"><div className="eyebrow">PUBLIC SCOREBOARD · LOCAL CRICKET</div><h1>Every match.<br/><em>One scorebook.</em></h1><p>Follow live scores, see what’s coming up, and browse completed scorecards.</p></section>
    {tournaments.length > 0 && <section className="public-match-section"><div className="section-head"><div><div className="eyebrow">LEAGUE TABLES</div><h2>Tournaments</h2></div></div><div className="tournament-list">{tournaments.map(tournament => <TournamentTable key={tournament.id} tournament={tournament} matches={matches} publicView />)}</div></section>}
    <section className="public-match-section">
      <div className="section-head"><div><div className="eyebrow">MATCH CENTRE</div><h2>Matches</h2></div><button className="team-cancel" onClick={() => void refresh()}>↻ Refresh</button></div>
      <nav className="public-match-filters" aria-label="Filter matches">{options.map(option => <button key={option.id} className={filter === option.id ? "selected" : ""} onClick={() => setFilter(option.id)}>{option.label}<span>{option.count}</span></button>)}</nav>
      {loading ? <div className="panel empty-state">Loading matches…</div> : problem ? <div className="panel empty-state"><b>Match list is not available yet</b><p>{problem}</p></div> : visible.length ? <div className="public-match-grid">{visible.map(match => {
        const current = match.innings[Math.max(0, match.innings.length - 1)];
        const statusText = match.status === "upcoming" ? "UPCOMING" : match.status === "live" ? "● LIVE" : match.status === "complete" ? "COMPLETED" : "INNINGS BREAK";
        const schedule = match.status === "upcoming" && match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : null;
        const runs = (index: number) => match.status === "upcoming" ? "Awaiting start" : match.innings[index] ? `${match.innings[index].runs}/${match.innings[index].wickets} · ${overs(match.innings[index].legal)}` : index === 1 && match.status === "innings-break" ? "Yet to bat" : "—";
        return <a className="panel public-match-card" href={`/matches/${encodeURIComponent(match.id)}`} key={match.id}>
          <div className="public-card-top"><span className={`match-status ${match.status}`}>{statusText}</span><span>{match.oversLimit} overs</span></div>
          <div className="public-teams"><b>{match.teams[0]}</b><strong>{runs(0)}</strong></div>
          <div className="public-teams"><b>{match.teams[1]}</b><strong>{runs(1)}</strong></div>
          <p className="public-card-note">{schedule || (match.status === "live" ? `${current?.runs ?? 0}/${current?.wickets ?? 0} · ${overs(current?.legal ?? 0)} overs` : new Date(match.createdAt).toLocaleDateString())}</p>
          <span className="public-card-link">{match.status === "upcoming" ? "MATCH DETAILS →" : "VIEW SCORECARD →"}</span>
        </a>;
      })}</div> : <div className="panel empty-state"><b>{filter === "upcoming" ? "No upcoming matches" : filter === "complete" ? "No completed matches yet" : filter === "live" ? "No live matches right now" : "No matches yet"}</b><p>{filter === "upcoming" ? "The scorer can schedule a fixture to show it here." : "Matches will appear here as soon as the scorer adds them."}</p></div>}
    </section>
    <footer><span>BUILT FOR THE LOVE OF THE GAME</span><span>BOUNDARY<span className="brand-dot">.</span> &nbsp;© 2026</span></footer>
  </main>;
}
