"use client";

import { useMemo, useState } from "react";
import { Scorecard } from "./Scorecard";
import { buildScorecard, overText, type ScoreBall, type ScoreMatchInput } from "../lib/scorecard";

type MatchViewInput = Omit<ScoreMatchInput, "status"> & { status: "upcoming" | "live" | "innings-break" | "complete"; scheduledAt?: string; innings: (ScoreMatchInput["innings"][number] & { bowler?: string; limitBalls?: number; superOver?: number })[] };
type Tab = "Live" | "Scorecard" | "Squads" | "Overs" | "Commentary" | "Info";
const tabs: Tab[] = ["Info", "Live", "Scorecard", "Squads", "Overs", "Commentary"];
const rate = (runs: number, balls: number) => balls ? (runs * 6 / balls).toFixed(2) : "0.00";
function ballLabel(ball: ScoreBall) {
  if (ball.wicket) return "W";
  if (!ball.extra) return String(ball.runs);
  if (ball.extra === "wide") return ball.runs > 1 ? `Wd+${ball.runs - 1}` : "Wd";
  if (ball.extra === "no-ball") return ball.runs > 1 ? `Nb+${ball.runs - 1}` : "Nb";
  return `${ball.extra === "bye" ? "B" : "Lb"}${ball.runs}`;
}
function resultText(match: MatchViewInput) {
  if (match.status === "upcoming") return "Upcoming fixture";
  if (match.status === "innings-break") return `${match.innings[0]?.batting || match.teams[0]} finished the first innings`;
  if (match.status !== "complete") return "Match in progress";
  const superOverNumber = Math.max(0, ...match.innings.map(innings => innings.superOver || 0));
  const superOverPair = superOverNumber ? match.innings.filter(innings => innings.superOver === superOverNumber) : [];
  const pair = superOverPair.length > 1 ? superOverPair.slice(-2) : match.innings.slice(0, 2);
  if (pair.length < 2) return "Innings complete";
  const [first, second] = pair;
  if (second.runs > first.runs) return `${second.batting} won${second.superOver ? " the Super Over" : ` by ${Math.max(0, second.squad.length - second.wickets - 1)} wickets`}`;
  if (second.runs < first.runs) return `${first.batting} won${first.superOver ? " the Super Over" : ` by ${first.runs - second.runs} runs`}`;
  return "Match tied";
}

export default function PublicMatchView({ match: input }: { match: ScoreMatchInput }) {
  const match = input as MatchViewInput;
  const [tab, setTab] = useState<Tab>(match.status === "upcoming" ? "Info" : "Live");
  const scorecard = useMemo(() => buildScorecard(input), [input]);
  const innings = match.innings[match.innings.length - 1];
  const inningsCard = scorecard.innings.find(i => i.batting === innings?.batting);
  const currentBatters = inningsCard?.batters.filter(b => b.name === innings?.striker || b.name === innings?.nonStriker) || [];
  const currentBowler = innings?.bowler || innings?.balls.at(-1)?.beforeBowler || innings?.bowlingSquad[0] || "—";
  const bowlingLine = inningsCard?.bowlers.find(b => b.name === currentBowler);
  const partnership = currentBatters.reduce((sum, b) => sum + b.runs, 0);
  const partnershipBalls = currentBatters.reduce((sum, b) => sum + b.balls, 0);
  const lastWicket = innings?.balls.filter(b => b.wicket).at(-1);
  const lastWicketName = lastWicket?.dismissed || "No wickets yet";
  const recentBalls = innings?.balls.slice(-60) || [];
  const recentRuns = recentBalls.reduce((sum, b) => sum + b.runs, 0);
  const recentWickets = recentBalls.filter(b => b.wicket).length;
  const overGroups = useMemo(() => {
    const groups: { number: number; balls: ScoreBall[] }[] = [];
    let legal = 0;
    for (const ball of innings?.balls || []) {
      const number = Math.floor(legal / 6) + 1;
      if (!groups[number - 1]) groups[number - 1] = { number, balls: [] };
      groups[number - 1].balls.push(ball);
      if (!ball.extra || ball.extra === "bye" || ball.extra === "leg-bye") legal += 1;
    }
    return groups.reverse();
  }, [innings?.balls]);
  const statusLabel = match.status === "upcoming" ? "UPCOMING" : match.status === "live" ? "LIVE NOW" : match.status === "complete" ? "COMPLETED" : "INNINGS BREAK";
  const chaseTarget = innings?.target ?? (match.innings.length > 1 && !innings?.superOver ? match.innings[0].runs + 1 : undefined);
  const runsNeeded = chaseTarget !== undefined ? Math.max(0, chaseTarget - (innings?.runs || 0)) : null;
  const ballsLeft = Math.max(0, (innings?.limitBalls ?? match.oversLimit * 6) - (innings?.legal || 0));

  return <div className="public-match-view">
    <section className="public-match-hero">
      <div className="public-match-meta"><span className={`public-live-badge ${match.status}`}>{match.status === "live" && <i />} {statusLabel}</span><span>{match.oversLimit} overs · {match.status === "upcoming" && match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : new Date(match.createdAt).toLocaleDateString()}</span></div>
      <div className="public-innings-score"><span>{innings?.batting || match.teams[0]}</span><strong>{innings?.runs ?? 0}<small>/{innings?.wickets ?? 0}</small></strong><span>({overText(innings?.legal ?? 0)} overs)</span></div>
      <div className="public-match-subline">{match.teams[0]} <b>vs</b> {match.teams[1]} <span>·</span> CRR {rate(innings?.runs ?? 0, innings?.legal ?? 0)}</div>
      {runsNeeded !== null && <div className="public-chase-line">{match.status === "complete" ? resultText(match) : `${innings.batting} need ${runsNeeded} runs from ${ballsLeft} balls`}</div>}
      {match.status === "innings-break" && <div className="public-chase-line">{resultText(match)}</div>}
    </section>
    <nav className="public-match-tabs" aria-label="Match details">{tabs.map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>

    {tab === "Live" && <div className="public-live-layout">
      <section className="panel public-live-panel"><div className="public-panel-heading"><div><div className="eyebrow">AT THE CREASE</div><h2>Batting now</h2></div><span className="public-panel-live">{match.status === "live" ? "LIVE" : statusLabel}</span></div>
        <div className="public-table-scroll"><table className="public-live-table"><thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>{currentBatters.length ? currentBatters.map(b => <tr key={b.name}><td><a>{b.name}{b.name === innings.striker ? <span className="strike-indicator"> *</span> : null}</a></td><td><b>{b.runs}</b></td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{b.balls ? (b.runs * 100 / b.balls).toFixed(2) : "—"}</td></tr>) : <tr><td colSpan={6}>Batting figures appear after the first ball.</td></tr>}</tbody></table></div>
        <div className="public-panel-heading public-bowler-heading"><div><div className="eyebrow">WITH THE BALL</div><h2>{innings?.bowlingSquad.find(p => p === currentBowler) ? "Bowling now" : "Bowling figures"}</h2></div></div>
        <div className="public-table-scroll"><table className="public-live-table public-bowler-table"><thead><tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>ECO</th></tr></thead><tbody><tr><td><a>{currentBowler}</a></td><td>{overText(bowlingLine?.balls ?? 0)}</td><td>{bowlingLine?.maidens ?? 0}</td><td>{bowlingLine?.runs ?? 0}</td><td><b>{bowlingLine?.wickets ?? 0}</b></td><td>{rate(bowlingLine?.runs ?? 0, bowlingLine?.balls ?? 0)}</td></tr></tbody></table></div>
        <div className="public-this-over"><b>THIS INNINGS</b><div>{innings?.balls.slice(-6).map((ball, i) => <span className={ball.wicket ? "wicket" : ""} key={`${i}-${ballLabel(ball)}`}>{ballLabel(ball)}</span>)}</div></div>
      </section>
      <aside className="panel public-key-stats"><div className="public-key-title">Key stats</div><div className="public-stat-row"><b>Partnership</b><span>{partnership} runs ({partnershipBalls} balls)</span></div><div className="public-stat-row"><b>Last wicket</b><span>{lastWicketName}{lastWicket ? ` · ${lastWicket.dismissal || "out"}` : ""}</span></div><div className="public-stat-row"><b>Last 10 overs</b><span>{recentRuns} runs{recentWickets ? `, ${recentWickets} wkts` : ""}</span></div><div className="public-key-footer"><div><span>RUN RATE</span><b>{rate(innings?.runs ?? 0, innings?.legal ?? 0)}</b></div><div><span>OVERS LEFT</span><b>{Math.max(0, match.oversLimit - Math.ceil((innings?.legal ?? 0) / 6))}</b></div></div></aside>
    </div>}
    {tab === "Scorecard" && <Scorecard match={scorecard} />}
    {tab === "Squads" && <section className="public-squad-grid">{match.teams.map(team => { const teamInnings = match.innings.find(i => i.batting === team); const players = teamInnings?.squad || match.innings.find(i => i.bowlingSquad.includes(team))?.bowlingSquad || []; return <article className="panel public-squad-card" key={team}><div className="eyebrow">SQUAD</div><h2>{team}</h2>{players.map((player, index) => <div className="public-squad-player" key={player}><span>{String(index + 1).padStart(2, "0")}</span>{player}{teamInnings?.dismissedBatters.includes(player) && <small>OUT</small>}</div>)}</article>; })}</section>}
    {tab === "Overs" && <section className="panel public-delivery-list"><div className="eyebrow">OVER BY OVER</div><h2>Innings · {innings?.batting}</h2>{overGroups.length ? overGroups.map(group => <article className="public-over-row" key={group.number}><div><b>Over {group.number}</b><small>{group.balls.reduce((sum, ball) => sum + ball.runs, 0)} runs</small></div><p>{group.balls.map((ball, i) => <span className={ball.wicket ? "wicket" : ""} key={i}>{ballLabel(ball)}</span>)}</p></article>) : <div className="empty-state">Ball-by-ball details will appear here.</div>}</section>}
    {tab === "Commentary" && <section className="panel public-delivery-list"><div className="eyebrow">BALL BY BALL</div><h2>Commentary</h2>{innings?.balls.length ? innings.balls.slice().reverse().map((ball, i) => <article className="public-commentary-row" key={`${i}-${ball.dismissed || ball.runs}`}><span className={`public-commentary-ball ${ball.wicket ? "wicket" : ""}`}>{ballLabel(ball)}</span><div><b>{ball.wicket ? `${ball.dismissed || "Wicket"} · ${ball.dismissal || "out"}` : ball.runs === 0 ? "Dot ball" : `${ball.runs} run${ball.runs === 1 ? "" : "s"}`}</b><p>{ball.wicket ? `Bowler: ${ball.beforeBowler || currentBowler}${ball.fielder ? ` · Fielder: ${ball.fielder}` : ""}` : `${ball.beforeStriker || innings.striker} · ${ball.beforeBowler || currentBowler}`}</p></div><small>{ball.beforeBowler || currentBowler}</small></article>) : <div className="empty-state">Commentary will appear after the first ball.</div>}</section>}
    {tab === "Info" && <section className="panel public-info-panel"><div className="eyebrow">MATCH INFORMATION</div><h2>{match.teams[0]} <em>vs</em> {match.teams[1]}</h2><div className="public-info-grid"><div><span>FORMAT</span><b>{match.oversLimit} overs per side</b></div><div><span>STATUS</span><b>{statusLabel}</b></div><div><span>BATTING NOW</span><b>{innings?.batting || "—"}</b></div><div><span>INNINGS</span><b>{innings?.superOver ? `Super Over ${innings.superOver}` : `${Math.min(match.innings.length, 2)} of 2`}</b></div><div><span>RESULT</span><b>{resultText(match)}</b></div></div></section>}
    <p className="public-view-only">Public scorecard · Read-only view</p>
  </div>;
}
