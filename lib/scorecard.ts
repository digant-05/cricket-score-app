import { playerOfMatch as calculatePlayerOfMatch } from "./player-performance";

export type ScoreBall = {
  runs: number;
  extra?: "wide" | "no-ball" | "bye" | "leg-bye";
  wicket?: boolean;
  beforeStriker?: string;
  beforeNonStriker?: string;
  beforeBowler?: string;
  dismissed?: string;
  dismissal?: string;
  fielder?: string;
};

export type ScoreInningsInput = {
  batting: string;
  runs: number;
  wickets: number;
  legal: number;
  balls: ScoreBall[];
  striker: string;
  nonStriker: string;
  squad: string[];
  bowlingSquad: string[];
  dismissedBatters: string[];
  target?: number;
  superOver?: number;
};

export type ScoreMatchInput = {
  id: string;
  createdAt: string;
  teams: [string, string];
  oversLimit: number;
  innings: ScoreInningsInput[];
  status: "live" | "innings-break" | "complete";
  playerOfMatch?: string;
  tossWinner?: string;
  tossDecision?: "bat" | "bowl";
};

export type BatterLine = { name: string; runs: number; balls: number; fours: number; sixes: number; dismissal: string };
export type BowlerLine = { name: string; balls: number; maidens: number; runs: number; wickets: number; noBalls: number; wides: number };
export type WicketFall = { name: string; runs: number; wickets: number; over: string };
export type ScorecardInnings = {
  batting: string;
  runs: number;
  wickets: number;
  legal: number;
  target?: number;
  superOver?: number;
  batters: BatterLine[];
  bowlers: BowlerLine[];
  extras: { total: number; byes: number; legByes: number; wides: number; noBalls: number };
  yetToBat: string[];
  fallOfWickets: WicketFall[];
};
export type ScorecardData = { id: string; createdAt: string; teams: [string, string]; oversLimit: number; status: ScoreMatchInput["status"]; playerOfMatch?: string; playerOfMatchPoints?: number; tossWinner?: string; tossDecision?: "bat" | "bowl"; innings: ScorecardInnings[] };

export const overText = (legal: number) => `${Math.floor(legal / 6)}.${legal % 6}`;

export function buildScorecard(match: ScoreMatchInput): ScorecardData {
  const innings = match.innings.map(input => {
    const batterMap = new Map<string, BatterLine>();
    const bowlerMap = new Map<string, BowlerLine>();
    const bowlerOvers = new Map<string, { balls: number; runs: number }>();
    input.squad.forEach(name => batterMap.set(name, { name, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: "did not bat" }));
    input.bowlingSquad.forEach(name => bowlerMap.set(name, { name, balls: 0, maidens: 0, runs: 0, wickets: 0, noBalls: 0, wides: 0 }));
    let extras = { total: 0, byes: 0, legByes: 0, wides: 0, noBalls: 0 };
    let totalRuns = 0;
    let totalWickets = 0;
    let legalBalls = 0;
    const appeared = new Set<string>();
    const fallOfWickets: WicketFall[] = [];
    for (const ball of input.balls) {
      const batter = batterMap.get(ball.beforeStriker || "");
      const bowler = bowlerMap.get(ball.beforeBowler || "");
      const legalDelivery = !ball.extra || ball.extra === "bye" || ball.extra === "leg-bye";
      const bowlerOverKey = bowler ? `${bowler.name}:${Math.floor(legalBalls / 6)}` : "";
      const extraRuns = ball.extra === "wide" || ball.extra === "no-ball" ? 1 : 0;
      const batRuns = ball.extra === "wide" || ball.extra === "bye" || ball.extra === "leg-bye" ? 0 : ball.extra === "no-ball" ? Math.max(0, ball.runs - 1) : ball.runs;
      if (ball.beforeStriker) appeared.add(ball.beforeStriker);
      if (ball.beforeNonStriker) appeared.add(ball.beforeNonStriker);
      if (batter) {
        if (ball.extra !== "wide") batter.balls += 1;
        batter.runs += batRuns;
        if (batRuns === 4) batter.fours += 1;
        if (batRuns === 6) batter.sixes += 1;
      }
      if (legalDelivery) {
        legalBalls += 1;
        if (bowler) bowler.balls += 1;
      } else if (bowler) {
        if (ball.extra === "wide") bowler.wides += 1;
        if (ball.extra === "no-ball") bowler.noBalls += 1;
      }
      const conceded = ball.extra === "bye" || ball.extra === "leg-bye" ? 0 : ball.runs;
      if (bowler) {
        bowler.runs += conceded;
        const over = bowlerOvers.get(bowlerOverKey) || { balls: 0, runs: 0 };
        over.runs += conceded;
        if (legalDelivery) over.balls += 1;
        if (over.balls === 6 && over.runs === 0) bowler.maidens += 1;
        bowlerOvers.set(bowlerOverKey, over);
      }
      if (ball.extra) {
        extras.total += ball.runs;
        if (ball.extra === "bye") extras.byes += ball.runs;
        if (ball.extra === "leg-bye") extras.legByes += ball.runs;
        if (ball.extra === "wide") extras.wides += ball.runs;
        if (ball.extra === "no-ball") extras.noBalls += ball.runs;
      }
      totalRuns += ball.runs;
      if (ball.wicket) {
        totalWickets += 1;
        const out = batterMap.get(ball.dismissed || "");
        if (out) out.dismissal = ball.dismissal === "Run out" ? `run out (${ball.fielder || "fielder"})` : ball.dismissal === "Retired out" ? "retired out" : ball.dismissal === "Caught" ? `c ${ball.fielder || "fielder"} b ${ball.beforeBowler || "bowler"}` : ball.dismissal === "Stumped" ? `st ${ball.fielder || "keeper"} b ${ball.beforeBowler || "bowler"}` : ball.dismissal === "Bowled" ? `b ${ball.beforeBowler || "bowler"}` : `${(ball.dismissal || "out").toLowerCase()} b ${ball.beforeBowler || "bowler"}`;
        if (bowler && !["Run out", "Retired out"].includes(ball.dismissal || "")) bowler.wickets += 1;
        fallOfWickets.push({ name: ball.dismissed || "Wicket", runs: totalRuns, wickets: totalWickets, over: overText(legalBalls) });
      }
    }
    for (const line of Array.from(batterMap.values())) {
      if (input.dismissedBatters.includes(line.name)) continue;
      line.dismissal = line.name === input.striker || line.name === input.nonStriker ? "not out" : appeared.has(line.name) ? "not out" : "did not bat";
    }
    return {
      batting: input.batting, runs: input.runs, wickets: input.wickets, legal: input.legal, target: input.target, superOver: input.superOver,
      batters: Array.from(batterMap.values()), bowlers: Array.from(bowlerMap.values()).filter(bowler => bowler.balls || bowler.runs || bowler.wickets || bowler.wides || bowler.noBalls),
      extras, yetToBat: input.squad.filter(name => !appeared.has(name) && name !== input.striker && name !== input.nonStriker && !input.dismissedBatters.includes(name)), fallOfWickets,
    };
  });
  const matchAward = match.status === "complete" ? calculatePlayerOfMatch(match) : undefined;
  return { id: match.id, createdAt: match.createdAt, teams: match.teams, oversLimit: match.oversLimit, status: match.status, playerOfMatch: matchAward?.name, playerOfMatchPoints: matchAward?.points, tossWinner: match.tossWinner, tossDecision: match.tossDecision, innings };
}
