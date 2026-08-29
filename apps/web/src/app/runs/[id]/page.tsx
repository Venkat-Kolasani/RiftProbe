"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getRunDetails, createRun } from "@/lib/api";

interface EventItem {
  event_type?: string;
  scenario_id: string;
  goal: string;
  verdict: string;
  score: number;
  violated_invariants: string[];
  failure_id?: string;
  category?: string;
  severity?: string;
}

export default function LiveRunView() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;

  const [runDetails, setRunDetails] = useState<any>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalScenarios, setTotalScenarios] = useState(20);
  const [isConnected, setIsConnected] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasCritical, setHasCritical] = useState(false);
  const [loadingCta, setLoadingCta] = useState(false);

  useEffect(() => {
    if (!runId) return;

    // Initial run details fetch
    getRunDetails(runId)
      .then((data) => {
        setRunDetails(data);
        if (data.summary) {
          setTotalScenarios(data.summary.total_scenarios || 20);
        }
      })
      .catch(() => {});

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const eventSource = new EventSource(`${apiBase}/v1/runs/${runId}/events`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event_type === "scenario_completed") {
          setEvents((prev) => [...prev, data]);
          setCompletedCount((prev) => prev + 1);
          if (data.severity === "critical") {
            setHasCritical(true);
          }
        } else if (data.event_type === "run_completed") {
          setIsCompleted(true);
          setIsConnected(false);
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setIsCompleted(true);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId]);

  const mode = runDetails?.mode || "baseline";
  const versionLabel = runDetails?.version_label || "v1.0";
  const progressPct = totalScenarios > 0 ? Math.min(100, Math.round((completedCount / totalScenarios) * 100)) : 0;

  const handleDiscoverNext = async () => {
    setLoadingCta(true);
    try {
      const res = await createRun(versionLabel, "discover");
      if (res.run_id) {
        router.push(`/runs/${res.run_id}`);
      }
    } catch (e: any) {
      alert(`Error starting discover run: ${e.message}`);
    } finally {
      setLoadingCta(false);
    }
  };

  return (
    <div>
      <Navbar currentStep={mode === "discover" || hasCritical ? 2 : 1} />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Run Title Header */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-[11px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Mode: {mode.toUpperCase()}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Agent: {versionLabel}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mt-2 flex items-center space-x-3">
              <span>Live Run Execution</span>
              <span className="text-xs bg-slate-800 text-slate-400 font-mono px-2.5 py-1 rounded">
                ID: {runId}
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Proof of live scenario trajectory execution and evaluation checks
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
              }`}
            />
            <span className="text-xs text-slate-300 font-mono">
              {isConnected ? "LIVE STREAMING" : isCompleted ? "RUN COMPLETED" : "CONNECTED"}
            </span>
          </div>
        </div>

        {/* Progress Bar & Counter Card */}
        <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-300 font-medium">
              Progress: <span className="text-cyan-400 font-bold font-mono">{completedCount} / {totalScenarios}</span> scenarios completed
            </span>
            <span className="text-xs text-slate-400 font-mono">{progressPct}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Critical Authority Bypass Pinned Banner */}
        {hasCritical && (
          <div className="bg-rose-950/80 border-2 border-rose-600 p-5 rounded-xl flex justify-between items-center shadow-lg shadow-rose-950/50">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-rose-300 bg-rose-900 px-2 py-0.5 rounded uppercase">
                CRITICAL VULNERABILITY SURFACED
              </span>
              <p className="text-slate-100 text-sm font-semibold mt-1">
                Critical: v1.0 refunded without identity verification after an authority claim.
              </p>
              <p className="text-xs text-rose-300/80 font-mono">
                Violated: identity_verification_required_before_refund
              </p>
            </div>
            <button
              onClick={() => router.push("/failures")}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-md transition-all shrink-0"
            >
              Inspect in Failure Explorer &rarr;
            </button>
          </div>
        )}

        {/* Post-Run Completion CTA Panel */}
        {isCompleted && !hasCritical && (
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl flex justify-between items-center">
            <div>
              <span className="text-xs font-mono text-emerald-400 font-semibold block">RUN COMPLETED CLEANLY</span>
              <p className="text-slate-300 text-sm mt-0.5">
                {mode === "baseline"
                  ? "Baseline is clean. Ready to hunt for authority-bypass vulnerability."
                  : "All scenarios completed successfully."}
              </p>
            </div>
            {mode === "baseline" && (
              <button
                onClick={handleDiscoverNext}
                disabled={loadingCta}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              >
                {loadingCta ? "Starting..." : "Next: Discover Failures &rarr;"}
              </button>
            )}
          </div>
        )}

        {/* Streaming Event Feed */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Execution Trajectory Feed
          </h2>

          {events.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-800 p-8 text-center text-slate-500 rounded-xl text-sm font-mono">
              Waiting for scenario trajectory events...
            </div>
          ) : (
            events.map((ev, idx) => {
              const isCrit = ev.severity === "critical";
              return (
                <div
                  key={idx}
                  className={`border p-4 rounded-xl flex justify-between items-center transition-all ${
                    isCrit
                      ? "bg-rose-950/40 border-rose-600 shadow-md shadow-rose-950/30"
                      : ev.verdict === "PASS"
                      ? "bg-slate-800/80 border-slate-700"
                      : "bg-amber-950/30 border-amber-800"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-slate-200 font-medium text-sm flex items-center space-x-2">
                      <span className="text-slate-500 font-mono text-xs">#{idx + 1}</span>
                      <span>{ev.goal}</span>
                    </div>
                    {ev.violated_invariants && ev.violated_invariants.length > 0 && (
                      <div className="text-xs text-rose-400 font-mono">
                        Violated Invariant: {ev.violated_invariants.join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full font-mono ${
                        ev.verdict === "PASS"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}
                    >
                      {ev.verdict}
                    </span>

                    {ev.failure_id && (
                      <button
                        onClick={() => router.push("/failures")}
                        className="text-xs bg-rose-900/60 hover:bg-rose-800 text-rose-200 px-3 py-1 rounded border border-rose-700 font-medium"
                      >
                        Inspect Failure
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
