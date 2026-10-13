import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "boundary-scorer";
export const authConfigured = () => process.env.NODE_ENV === "production" || Boolean(process.env.SCORER_PASSWORD && process.env.SCORER_SESSION_SECRET);
const signature = (value: string) => createHmac("sha256", process.env.SCORER_SESSION_SECRET || "local-development-only").update(value).digest("hex");
export function issueSession() { const payload = Buffer.from(String(Date.now() + 7 * 24 * 60 * 60 * 1000)).toString("base64url"); return `${payload}.${signature(payload)}`; }
export async function isScorer() { const token = (await cookies()).get(COOKIE)?.value; if (!token) return false; const [payload, mac] = token.split("."); if (!payload || !mac) return false; const expected = signature(payload); if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false; try { return Number(Buffer.from(payload, "base64url").toString()) > Date.now(); } catch { return false; } }
export const scorerCookie = COOKIE;
