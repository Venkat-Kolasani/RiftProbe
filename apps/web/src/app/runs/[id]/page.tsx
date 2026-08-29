"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
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

    getRunDetails(runId)
      .then((data) => {
        setRunDetails(data);
        if (data.summary) setTotalScenarios(data.summary.total_scenarios || 20);
      })
      .catch(() => {});

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const eventSource = new EventSource(`${apiBase}/v1/runs/${runId}/events`);

    eventSource.onopen = () => setIsConnected(true);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event_type === "scenario_completed") {
          setEvents((prev) => [...prev, data]);
          setCompletedCount((prev) => prev + 1);
          if (data.severity === "critical") setHasCritical(true);
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

    return () => eventSource.close();
  }, [runId]);

  const mode = runDetails?.mode || "baseline";
  const versionLabel = runDetails?.version_label || "v1.0";
  const progressPct =
    totalScenarios > 0 ? Math.min(100, Math.round((completedCount / totalScenarios) * 100)) : 0;

  const handleDiscoverNext = async () => {
    setLoadingCta(true);
    try {
      const res = await createRun(versionLabel, "discover");
      if (res.run_id) router.push(`/runs/${res.run_id}`);
    } catch (e: any) {
      alert(`Error starting discover run: ${e.message}`);
    } finally {
      setLoadingCta(false);
    }
  };

  return (
    <PageShell glow={false}>
      <Navbar currentStep={mode === "discover" || hasCritical ? 2 : 1} />

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <div className="flex flex-col gap-4 border-b border-brand-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex gap-2">
              <span className="badge-orange">{mode.toUpperCase()}</span>
              <span className="rounded-full border border-brand-border px-2.5 py-0.5 text-xs text-brand-muted">
                {versionLabel}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white">Live run</h1>
            <p className="mt-1 font-mono text-xs text-brand-muted">ID: {runId}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-brand-orange animate-pulse" : "bg-brand-muted"
              }`}
            />
            <span className="text-xs text-brand-muted">
              {isConnected ? "Streaming" : isCompleted ? "Completed" : "Connecting"}
            </span>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex justify-between text-sm">
            <span className="text-brand-muted">
              <span className="font-mono text-brand-orange">{completedCount}</span> / {totalScenarios} scenarios
            </span>
            <span className="font-mono text-brand-muted">{progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-brand-surface">
            <div
              className="h-full rounded-full bg-brand-orange transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {hasCritical && (
          <div className="card border-red-900/50 bg-red-950/30 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-red-400">
              Critical vulnerability
            </p>
            <p className="mt-2 text-sm text-white">
              v1.0 refunded without identity verification after an authority claim.
            </p>
            <button
              onClick={() => router.push("/failures")}
              className="btn-primary mt-4 text-xs"
            >
              Inspect in Failure Explorer →
            </button>
          </div>
        )}

        {isCompleted && !hasCritical && mode === "baseline" && (
          <div className="card p-5">
            <p className="text-sm text-white">Baseline completed cleanly.</p>
            <p className="mt-1 text-sm text-brand-muted">Ready to hunt for authority-bypass failures.</p>
            <button
              onClick={handleDiscoverNext}
              disabled={loadingCta}
              className="btn-primary mt-4 text-xs disabled:opacity-50"
            >
              {loadingCta ? "Starting…" : "Discover Failures →"}
            </button>
          </div>
        )}

        <div>
          <p className="section-label mb-4">Execution feed</p>
          {events.length === 0 ? (
            <div className="empty-state">Waiting for scenario events…</div>
          ) : (
            <div className="space-y-2">
              {events.map((ev, idx) => {
                const isCrit = ev.severity === "critical";
                return (
                  <div
                    key={idx}
                    className={`card flex items-center justify-between gap-4 p-4 ${
                      isCrit ? "border-red-900/50 bg-red-950/20" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-white">
                        <span className="font-mono text-xs text-brand-muted">#{idx + 1}</span>
                        <span className="truncate">{ev.goal}</span>
                      </div>
                      {ev.violated_invariants?.length > 0 && (
                        <p className="mt-1 font-mono text-xs text-red-400">
                          {ev.violated_invariants.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={ev.verdict === "PASS" ? "badge-pass" : "badge-block"}>
                        {ev.verdict}
                      </span>
                      {ev.failure_id && (
                        <button
                          onClick={() => router.push("/failures")}
                          className="btn-ghost text-xs"
                        >
                          Inspect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </PageShell>
  );
}
