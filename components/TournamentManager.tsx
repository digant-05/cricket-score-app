"use client";
import type { FormEvent } from "react";

export type Tournament = { id: string; name: string; teams: string[]; playerOfSeries?: string };
type Match = { tournamentId?: string; status: string; teams: string[]; oversLimit: number; innings: { batting: string; runs: number; legal: number; superOver?: number }[] };
type Team = { name: string; players: string[] };

function tableRows(tournament: Tournament, matches: Match[]) {
  const games = matches.filter(match => match.tournamentId === tournament.id && match.status === "complete");
  return tournament.teams.map(team => {
    let played = 0, won = 0, tied = 0, points = 0, scored = 0, conceded = 0, ballsFor = 0, ballsAgainst = 0;
    for (const match of games) {
      const innings = match.innings.filter(item => item.superOver === undefined).slice(0, 2);
      const own = innings.find(item => item.batting === team), opposition = innings.find(item => item.batting !== team);
      if (!own || !opposition) continue;
      played++; scored += own.runs; conceded += opposition.runs; ballsFor += own.legal; ballsAgainst += Math.min(opposition.legal, match.oversLimit * 6);
      let resultWinner: string | undefined = own.runs > opposition.runs ? team : own.runs < opposition.runs ? opposition.batting : undefined;
      if (own.runs === opposition.runs) { const superOvers = match.innings.filter(item => item.superOver !== undefined).slice(-2); if (superOvers.length === 2 && superOvers[0].runs !== superOvers[1].runs) resultWinner = superOvers[0].runs > superOvers[1].runs ? superOvers[0].batting : superOvers[1].batting; }
      if (resultWinner === team) { won++; points += 2; } else if (!resultWinner) { tied++; points++; }
    }
    const nrr = (ballsFor ? scored * 6 / ballsFor : 0) - (ballsAgainst ? conceded * 6 / ballsAgainst : 0);
    return { team, played, won, tied, points, nrr };
  }).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
}

export function TournamentTable({ tournament, matches, publicView = false, playerOfSeries, players = [], onSeriesAward }: { tournament: Tournament; matches: Match[]; publicView?: boolean; playerOfSeries?: string; players?: string[]; onSeriesAward?: (player: string) => void }) {
  const games = matches.filter(match => match.tournamentId === tournament.id && match.status === "complete");
  const rows = tableRows(tournament, matches);
  return <article className="panel tournament-card"><div className="eyebrow">{publicView ? "TOURNAMENT STANDINGS" : `TOURNAMENT · ${games.length} COMPLETED MATCHES`}</div><h2>{tournament.name}</h2><div className="table-scroll"><table><thead><tr><th>TEAM</th><th>P</th><th>W</th><th>T</th><th>NRR</th><th>PTS</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.team}><td><b>{index === 0 && row.played ? "♛ " : ""}{row.team}</b></td><td>{row.played}</td><td>{row.won}</td><td>{row.tied}</td><td>{row.nrr.toFixed(2)}</td><td><b>{row.points}</b></td></tr>)}</tbody></table></div>{!publicView && onSeriesAward && <label className="series-award-label">PLAYER OF THE SERIES<select value={playerOfSeries || ""} onChange={event => onSeriesAward(event.target.value)}><option value="">Select series award</option>{players.map(player => <option key={player}>{player}</option>)}</select></label>}{playerOfSeries && <p className="award-result">🏅 Player of the Series: <b>{playerOfSeries}</b></p>}</article>;
}

export default function TournamentManager({ tournaments, matches, teams, name, selectedTeams, onName, onTeams, onCreate, onSeriesAward }: { tournaments: Tournament[]; matches: Match[]; teams: Team[]; name: string; selectedTeams: string[]; onName: (value: string) => void; onTeams: (values: string[]) => void; onCreate: (event: FormEvent<HTMLFormElement>) => void; onSeriesAward: (tournamentId: string, player: string) => void }) {
  return <section className="tournament-manager"><div className="panel team-editor"><div className="eyebrow">COMPETITION SETUP</div><h2>Create a tournament</h2><p>Choose saved teams, then link each new fixture to this competition.</p><form onSubmit={onCreate}><label>TOURNAMENT NAME<input value={name} onChange={event => onName(event.target.value)} placeholder="e.g. Riverside Premier League" required /></label><fieldset className="tournament-team-field"><legend>TEAMS · SELECT AT LEAST TWO</legend><div className="tournament-team-options">{teams.map(team => <label key={team.name}><input type="checkbox" checked={selectedTeams.includes(team.name)} onChange={event => onTeams(event.target.checked ? [...selectedTeams, team.name] : selectedTeams.filter(name => name !== team.name))} />{team.name}</label>)}</div></fieldset><button className="primary-btn" type="submit" disabled={teams.length < 2}>CREATE TOURNAMENT <span>→</span></button></form></div><div className="tournament-list">{tournaments.map(tournament => { const players = Array.from(new Set(tournament.teams.flatMap(team => teams.find(item => item.name === team)?.players || []))); return <TournamentTable key={tournament.id} tournament={tournament} matches={matches} players={players} playerOfSeries={tournament.playerOfSeries} onSeriesAward={player => onSeriesAward(tournament.id, player)} />; })}{!tournaments.length && <div className="panel empty-state"><b>No tournaments yet</b><p>Create one here, then assign matches to it.</p></div>}</div></section>;
}
