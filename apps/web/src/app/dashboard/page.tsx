"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
import { createRun, listRuns, checkReleaseGate } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RunDashboard() {
  const router = useRouter();
  const [loadingMode, setLoadingMode] = useState<string | null>(null);
  const [versionLabel, setVersionLabel] = useState("v1.0");
  const [latestRun, setLatestRun] = useState<any>(null);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [hasCritical, setHasCritical] = useState(false);
  const [gateVerdict, setGateVerdict] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      const runsRes = await listRuns();
      if (runsRes?.runs?.length > 0) {
        const matchingRun =
          runsRes.runs.find((r: any) => r.version_label === versionLabel) || runsRes.runs[0];
        setLatestRun(matchingRun);
        setHasBaseline(runsRes.runs.some((r: any) => r.mode === "baseline"));
        setHasCritical(
          runsRes.runs.some(
            (r: any) => r.events?.some((e: any) => e.severity === "critical")
          )
        );
      }

      const gateRes = await checkReleaseGate(versionLabel);
      if (gateRes?.verdict) setGateVerdict(gateRes.verdict);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 3000);
    return () => clearInterval(interval);
  }, [versionLabel]);

  const handleStartRun = async (mode: "baseline" | "discover") => {
    setLoadingMode(mode);
    try {
      const res = await createRun(versionLabel, mode);
      if (res.run_id) router.push(`/runs/${res.run_id}`);
    } catch (e: any) {
      alert(`Error starting ${mode} run: ${e.message}`);
    } finally {
      setLoadingMode(null);
    }
  };

  const completedCount = latestRun?.events?.length || 0;
  const passedCount = latestRun?.events?.filter((e: any) => e.verdict === "PASS").length || 0;
  const failedCount = completedCount - passedCount;
  const criticalCount =
    latestRun?.events?.filter((e: any) => e.severity === "critical").length || 0;
  const healthScore =
    completedCount > 0 ? ((passedCount / completedCount) * 100).toFixed(1) : null;

  const nextAction = !latestRun
    ? "Run Baseline against v1.0. It should look healthy."
    : hasCritical
    ? "Critical failure found. Open Failure Explorer to create a regression."
    : hasBaseline
    ? "Baseline is clean. Run Discover Failures to hunt the authority-claim cheat."
    : gateVerdict === "PASS"
    ? "Gate flipped to PASS. The cheat is now a permanent regression."
    : "Release gate is BLOCK. Switch to v1.1 and run the regression suite.";

  const metrics = [
    { label: "Health", value: healthScore ? `${healthScore}%` : "—", accent: true },
    { label: "Total", value: latestRun?.total ?? "—" },
    { label: "Passed", value: passedCount, pass: true },
    { label: "Failed", value: failedCount },
    { label: "Critical", value: criticalCount, critical: true },
  ];

  return (
    <PageShell glow={false}>
      <Navbar currentStep={hasCritical ? 3 : hasBaseline ? 2 : 1} />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="flex flex-col gap-4 border-b border-brand-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2">Run Dashboard</p>
            <h1 className="text-2xl font-semibold text-white">Agent health & experiments</h1>
            <p className="mt-1 text-sm text-brand-muted">
              RetailOps support agent — run baseline, then hunt for policy failures.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-brand-muted">Agent version</label>
            <select
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              className="input-select"
            >
              <option value="v1.0">v1.0 (Vulnerable)</option>
              <option value="v1.1">v1.1 (Corrected)</option>
            </select>
          </div>
        </div>

        <div>
          <p className="section-label mb-4">Live metrics</p>
          {latestRun ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {metrics.map((m) => (
                <div key={m.label} className="card p-4">
                  <p className="text-xs text-brand-muted">{m.label}</p>
                  <p
                    className={`mt-1 text-2xl font-semibold ${
                      m.accent
                        ? "text-brand-orange"
                        : m.pass
                        ? "text-emerald-400"
                        : m.critical && Number(m.value) > 0
                        ? "text-red-400"
                        : "text-white"
                    }`}
                  >
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No run yet. Start with Baseline below.</div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h3 className="text-sm font-medium text-white">Run Baseline</h3>
            <p className="mt-2 text-sm text-brand-muted">
              20 standard support scenarios. Should pass cleanly on v1.0.
            </p>
            <button
              onClick={() => handleStartRun("baseline")}
              disabled={loadingMode === "baseline"}
              className="btn-primary mt-6 w-full disabled:opacity-50"
            >
              {loadingMode === "baseline" ? "Starting…" : "Run Baseline (20)"}
            </button>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium text-white">Discover Failures</h3>
            <p className="mt-2 text-sm text-brand-muted">
              Hunt authority-bypass: manager claims skip identity verification.
            </p>
            <button
              onClick={() => handleStartRun("discover")}
              disabled={loadingMode === "discover"}
              className="btn-primary mt-6 w-full disabled:opacity-50"
            >
              {loadingMode === "discover" ? "Hunting…" : "Discover Failures"}
            </button>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-brand-border bg-brand-surface/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Next action</p>
            <p className="mt-1 text-sm text-white">{nextAction}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/failures")} className="btn-secondary text-xs">
              Failure Explorer
            </button>
            <button onClick={() => router.push("/regressions")} className="btn-secondary text-xs">
              Regression Center
            </button>
          </div>
        </div>
      </footer>
    </PageShell>
  );
}
