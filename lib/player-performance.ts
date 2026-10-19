export type PerformanceBall = {
  runs: number;
  extra?: "wide" | "no-ball" | "bye" | "leg-bye" | "bonus" | "penalty";
  wicket?: boolean;
  beforeStriker?: string;
  beforeBowler?: string;
  dismissed?: string;
  dismissal?: string;
  fielder?: string;
};
export type PerformanceInnings = { batting: string; balls: PerformanceBall[] };
export type PerformanceMatch = { id: string; status: string; innings: PerformanceInnings[] };
export type PlayerPerformance = { name: string; matches: number; runs: number; wickets: number; fielding: number; points: number };

export function playerPerformances(matches: PerformanceMatch[]): PlayerPerformance[] {
  const totals = new Map<string, PlayerPerformance>();
  const appearance = new Map<string, Set<string>>();
  const get = (name?: string) => {
    if (!name) return undefined;
    if (!totals.has(name)) { totals.set(name, { name, matches: 0, runs: 0, wickets: 0, fielding: 0, points: 0 }); appearance.set(name, new Set()); }
    return totals.get(name)!;
  };
  for (const match of matches) {
    if (match.status !== "complete") continue;
    const matchPoints = new Map<string, number>();
    const mark = (player: string | undefined, points: number) => { if (!player) return; get(player); matchPoints.set(player, (matchPoints.get(player) || 0) + points); appearance.get(player)!.add(match.id); };
    for (const innings of match.innings) {
      let legalSeen = 0;
      const batStats = new Map<string, { runs: number; balls: number; fours: number; sixes: number }>();
      const bowlStats = new Map<string, { legal: number; conceded: number; wickets: number; overs: Map<number, { legal: number; conceded: number }> }>();
      for (const ball of innings.balls) {
        const striker = ball.beforeStriker;
        if (striker) {
          const bat = batStats.get(striker) || { runs: 0, balls: 0, fours: 0, sixes: 0 };
          const batRuns = ball.extra === "bonus" || ball.extra === "penalty" || ball.extra === "wide" || ball.extra === "bye" || ball.extra === "leg-bye" ? 0 : ball.extra === "no-ball" ? Math.max(0, ball.runs - 1) : ball.runs;
          bat.runs += batRuns;
          if (ball.extra !== "wide" && ball.extra !== "bonus" && ball.extra !== "penalty") bat.balls++;
          if (batRuns === 4) bat.fours++;
          if (batRuns === 6) bat.sixes++;
          batStats.set(striker, bat);
        }
        const bowlerName = ball.beforeBowler;
        const legal = !ball.extra || ball.extra === "bye" || ball.extra === "leg-bye";
        const overNo = Math.floor(legalSeen / 6);
        if (bowlerName) {
          const bowler = bowlStats.get(bowlerName) || { legal: 0, conceded: 0, wickets: 0, overs: new Map<number, { legal: number; conceded: number }>() };
          const over = bowler.overs.get(overNo) || { legal: 0, conceded: 0 };
          const conceded = ball.extra === "bye" || ball.extra === "leg-bye" || ball.extra === "bonus" || ball.extra === "penalty" ? 0 : ball.runs;
          bowler.conceded += conceded; over.conceded += conceded;
          if (legal) { bowler.legal++; over.legal++; }
          if (ball.wicket && !["Run out", "Retired out"].includes(ball.dismissal || "")) bowler.wickets++;
          bowler.overs.set(overNo, over); bowlStats.set(bowlerName, bowler);
        }
        if (ball.wicket && ball.fielder && ["Caught", "Stumped", "Run out"].includes(ball.dismissal || "")) mark(ball.fielder, 10);
        if (legal) legalSeen++;
      }
      for (const [name, bat] of Array.from(batStats.entries())) {
        const line = get(name)!; line.runs += bat.runs;
        let points = bat.runs + bat.fours + bat.sixes * 2;
        const strikeRate = bat.balls ? bat.runs * 100 / bat.balls : 0;
        if (bat.balls >= 10) points += strikeRate >= 150 ? 10 : strikeRate >= 120 ? 5 : strikeRate < 50 ? -5 : 0;
        mark(name, points);
      }
      for (const [name, bowl] of Array.from(bowlStats.entries())) {
        const line = get(name)!; line.wickets += bowl.wickets;
        let points = bowl.wickets * 25;
        for (const over of Array.from(bowl.overs.values())) if (over.legal === 6 && over.conceded === 0) points += 8;
        const overs = bowl.legal / 6;
        const economy = overs ? bowl.conceded / overs : 0;
        if (overs >= 1) points += economy < 6 ? 8 : economy < 8 ? 4 : economy > 12 ? -8 : 0;
        mark(name, points);
      }
    }
    for (const [name, points] of Array.from(matchPoints.entries())) get(name)!.points += points;
  }
  for (const [name, player] of Array.from(totals.entries())) player.matches = appearance.get(name)?.size || 0;
  return Array.from(totals.values()).sort((a, b) => b.points - a.points || b.wickets - a.wickets || b.runs - a.runs || a.name.localeCompare(b.name));
}

export function playerOfMatch(match: PerformanceMatch): PlayerPerformance | undefined {
  return playerPerformances([{ ...match, id: "match-award" }])[0];
}
