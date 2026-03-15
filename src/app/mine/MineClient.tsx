"use client";

import { useEffect, useMemo, useState } from "react";
import { MintMachineHero } from "../ui/MintMachineHero";

type Challenge = {
  id: string;
  seed: string;
  instructions: string;
  expiresAt: string;
};

function getSessionId() {
  if (typeof window === "undefined") return "";
  const k = "paper_session_id";
  let v = window.localStorage.getItem(k);
  if (!v) {
    v = `sess_${crypto.randomUUID().replace(/-/g, "")}`;
    window.localStorage.setItem(k, v);
  }
  return v;
}

export default function MineClient() {
  const sessionId = useMemo(() => getSessionId(), []);

  const [points, setPoints] = useState<number>(0);
  const [today, setToday] = useState<string>("");
  const [remaining, setRemaining] = useState<number>(0);
  const [dailyCap, setDailyCap] = useState<number>(25);
  const [streak, setStreak] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [artifact, setArtifact] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [printing, setPrinting] = useState<boolean>(false);

  async function refreshMe() {
    const res = await fetch(`/api/paper/me?sessionId=${encodeURIComponent(sessionId)}`);
    const j = await res.json();
    if (j?.ok) {
      setPoints(j.me.points || 0);
      setToday(j.me.today || "");
      setDailyCap(j.me.dailyCap || 25);
      setRemaining(j.me.remaining ?? 0);
      setStreak(j.me.streak ?? 0);
      setMultiplier(Number(j.me.multiplier || 1));
    }
  }

  async function newChallenge() {
    setStatus("Issuing challenge...");
    const res = await fetch("/api/paper/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const j = await res.json();
    if (!j?.ok) {
      if (j?.error === "daily_cap") {
        setStatus(`Daily cap reached. Come back tomorrow. (${remaining}/${dailyCap} remaining)`);
      } else {
        setStatus(`Challenge failed: ${j?.error || "unknown"}`);
      }
      return;
    }
    setChallenge(j.challenge);
    setArtifact("");
    setStatus("Challenge ready.");
  }

  async function submit() {
    if (!challenge) return;
    setStatus("Submitting...");
    setPrinting(true);
    const stopTimer = window.setTimeout(() => setPrinting(false), 1800);

    const res = await fetch("/api/paper/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        challengeId: challenge.id,
        artifact,
      }),
    });
    const j = await res.json();

    window.clearTimeout(stopTimer);
    setPrinting(false);

    if (!j?.ok) {
      setStatus(`Submit failed: ${j?.error || "unknown"}`);
      return;
    }

    // Fun micro-reward for success
    if (j.submission?.points > 0) {
      // best-effort confetti
      import("canvas-confetti")
        .then((m: any) => {
          const confetti = m.default || m;
          confetti({
            particleCount: 90,
            spread: 68,
            origin: { y: 0.7 },
            colors: ["#22c55e", "#c7f9cc", "#e7f2e8"],
          });
        })
        .catch(() => {});
    }

    setStatus(`Verdict: ${j.submission.verdict}. +${j.submission.points} points.`);
    await refreshMe();
  }

  useEffect(() => {
    refreshMe();
  }, []);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <MintMachineHero printing={printing} />

      <div className="card">
        <div className="kicker">Today</div>
        <div className="cardTitle">Daily cap + streak</div>
        <div className="cardBody" style={{ display: "grid", gap: 6 }}>
          <div>
            Challenges remaining: <b>{remaining}</b> / {dailyCap}
            {today ? <span style={{ opacity: 0.75 }}> (day: {today})</span> : null}
          </div>
          <div>
            Streak: <b>{streak}</b> · Multiplier: <b>{multiplier.toFixed(1)}x</b>
          </div>
          <div style={{ opacity: 0.8 }}>
            Correct answers increase your multiplier. A miss resets streak to 0.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="kicker">Your balance</div>
        <div className="cardTitle">Claimable PAPER (offchain for now)</div>
        <div className="cardBody">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{points}</div>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            No wallet signatures during mining. Claim will be a separate step later.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="kicker">Challenge</div>
        <div className="cardTitle">Market-sim comprehension task</div>
        <div className="cardBody" style={{ display: "grid", gap: 10 }}>
          <button className="button" onClick={newChallenge}>
            New challenge
          </button>

          {challenge ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ opacity: 0.85, fontSize: 12 }}>expires: {new Date(challenge.expiresAt).toLocaleString()}</div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "rgba(255,255,255,0.04)",
                  padding: 12,
                  borderRadius: 12,
                  margin: 0,
                }}
              >
                {challenge.instructions}
              </pre>
            </div>
          ) : (
            <div style={{ opacity: 0.8 }}>Click “New challenge” to start.</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="kicker">Submit</div>
        <div className="cardTitle">Your artifact</div>
        <div className="cardBody" style={{ display: "grid", gap: 10 }}>
          <textarea
            value={artifact}
            onChange={(e) => setArtifact(e.target.value)}
            placeholder="Write your plan here. Include words like: entry, exit, risk, fail (verifier checks this for now)."
            rows={7}
            style={{ width: "100%", resize: "vertical" }}
          />
          <button className="button" disabled={!challenge || artifact.trim().length < 10} onClick={submit}>
            Submit
          </button>
          {status ? <div style={{ opacity: 0.85 }}>{status}</div> : null}
        </div>
      </div>

      <div className="card">
        <div className="kicker">Dev notes</div>
        <div className="cardBody" style={{ opacity: 0.85 }}>
          MVP verifier is intentionally simple/deterministic. Next iteration: real “artifact format” + stronger anti-sybil.
        </div>
      </div>
    </div>
  );
}
