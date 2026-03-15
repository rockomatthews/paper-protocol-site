import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServerAdmin } from "../../_supabase";

function dayMT() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const runtime = "nodejs";

const QuerySchema = z.object({
  sessionId: z.string().min(8),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = QuerySchema.safeParse({ sessionId: url.searchParams.get("sessionId") || "" });
  if (!q.success) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const sb = supabaseServerAdmin();

  const { data: bal, error: balErr } = await sb
    .from("paper_balances")
    .select("session_id, points")
    .eq("session_id", q.data.sessionId)
    .maybeSingle();

  if (balErr) {
    return NextResponse.json({ ok: false, error: "db_read_failed" }, { status: 500 });
  }

  const today = dayMT();
  const { data: st } = await sb
    .from("paper_session_state")
    .select("session_id, day, streak, challenges_issued, submissions_ok")
    .eq("session_id", q.data.sessionId)
    .maybeSingle();

  const sameDay = String((st as any)?.day || "") === today;
  const challengesIssued = sameDay ? Number((st as any)?.challenges_issued || 0) : 0;
  const streak = sameDay ? Number((st as any)?.streak || 0) : 0;

  const dailyCap = 25;
  const remaining = Math.max(0, dailyCap - challengesIssued);
  const multiplier = Math.min(1 + 0.1 * streak, 3.0);

  return NextResponse.json({
    ok: true,
    me: {
      sessionId: q.data.sessionId,
      points: bal?.points ?? 0,
      today,
      dailyCap,
      challengesIssued,
      remaining,
      streak,
      multiplier,
    },
  });
}
