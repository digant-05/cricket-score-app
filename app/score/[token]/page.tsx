import { Scorecard } from "../../../components/Scorecard";
import type { ScorecardData } from "../../../lib/scorecard";

export const dynamic = "force-dynamic";

export default async function PublicScorecardPage({ params }: { params: { token: string } }) {
  let scorecard: ScorecardData | null = null;
  try {
    scorecard = JSON.parse(Buffer.from(params.token, "base64url").toString("utf8")) as ScorecardData;
    if (!scorecard || !Array.isArray(scorecard.innings) || !Array.isArray(scorecard.teams)) scorecard = null;
  } catch {
    scorecard = null;
  }
  return <main className="shell public-scorecard-shell">{scorecard ? <Scorecard match={scorecard} /> : <section className="panel public-scorecard-error"><div className="eyebrow">BOUNDARY · PUBLIC SCORECARD</div><h1>Scorecard link unavailable</h1><p>This link is incomplete or invalid. Ask the scorer to create a fresh scorecard link.</p></section>}</main>;
}
