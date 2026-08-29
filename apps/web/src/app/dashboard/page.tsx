"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
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
      if (runsRes && runsRes.runs && runsRes.runs.length > 0) {
        const matchingRun = runsRes.runs.find((r: any) => r.version_label === versionLabel) || runsRes.runs[0];
        setLatestRun(matchingRun);
        
        const baselineExists = runsRes.runs.some((r: any) => r.mode === "baseline");
        setHasBaseline(baselineExists);

        const criticalExists = runsRes.runs.some((r: any) => r.events && r.events.some((e: any) => e.severity === "critical"));
        setHasCritical(criticalExists);
      }

      const gateRes = await checkReleaseGate(versionLabel);
      if (gateRes && gateRes.verdict) {
        setGateVerdict(gateRes.verdict);
      }
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
      if (res.run_id) {
        router.push(`/runs/${res.run_id}`);
      }
    } catch (e: any) {
      alert(`Error starting ${mode} run: ${e.message}`);
    } finally {
      setLoadingMode(null);
    }
  };

  const completedCount = latestRun?.events?.length || 0;
  const passedCount = latestRun?.events?.filter((e: any) => e.verdict === "PASS").length || 0;
  const failedCount = completedCount - passedCount;
  const criticalCount = latestRun?.events?.filter((e: any) => e.severity === "critical").length || 0;
  const healthScore = completedCount > 0 ? ((passedCount / completedCount) * 100).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      <div>
        <Navbar currentStep={hasCritical ? 3 : hasBaseline ? 2 : 1} />
        <main className="max-w-6xl mx-auto p-8 space-y-8">
          {/* Header Banner */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">
                RiftProbe
              </h1>
              <p className="text-slate-400 mt-1 font-normal text-sm">
                Find how an AI agent fails. Turn that failure into a permanent release gate.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <label className="text-xs font-medium text-slate-400">Agent Version:</label>
              <select
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="v1.0">v1.0 (Vulnerable Agent)</option>
                <option value="v1.1">v1.1 (Corrected Agent)</option>
              </select>
            </div>
          </div>

          {/* Live Metrics Grid */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-3">
              Live Health Metrics
            </h2>
            {latestRun ? (
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                  <span className="text-sm text-slate-400 font-medium">Health Score</span>
                  <div className="text-3xl font-semibold text-cyan-400 mt-1">{healthScore}%</div>
                  <span className="text-xs text-slate-500 mt-1 block">Latest run ({latestRun.mode})</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                  <span className="text-sm text-slate-400 font-medium">Total Scenarios</span>
                  <div className="text-3xl font-semibold text-slate-100 mt-1">{latestRun.total}</div>
                  <span className="text-xs text-slate-500 mt-1 block">Enqueued scenarios</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                  <span className="text-sm text-slate-400 font-medium">Passed</span>
                  <div className="text-3xl font-semibold text-emerald-400 mt-1">{passedCount}</div>
                  <span className="text-xs text-slate-500 mt-1 block">Passed evaluations</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                  <span className="text-sm text-slate-400 font-medium">Failed</span>
                  <div className="text-3xl font-semibold text-slate-300 mt-1">{failedCount}</div>
                  <span className="text-xs text-slate-500 mt-1 block">Failed evaluations</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
                  <span className="text-sm text-slate-400 font-medium">Critical</span>
                  <div className="text-3xl font-semibold text-rose-400 mt-1">{criticalCount}</div>
                  <span className="text-xs text-slate-500 mt-1 block">Safety violations</span>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500 rounded-lg">
                No run yet. Start with Baseline below.
              </div>
            )}
          </div>

          {/* Primary Action Cards */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-100">Run Baseline</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Executes 20 standard customer/order support scenarios to verify baseline health.
                </p>
              </div>
              <button
                onClick={() => handleStartRun("baseline")}
                disabled={loadingMode === "baseline"}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {loadingMode === "baseline" ? "Starting Baseline..." : "Run Baseline Scenarios (20)"}
              </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-100">Discover Failures</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Hunts for authority-bypass vulnerabilities to surface policy violations.
                </p>
              </div>
              <button
                onClick={() => handleStartRun("discover")}
                disabled={loadingMode === "discover"}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {loadingMode === "discover" ? "Hunting Failures..." : "Discover Failures (Targeted Hunt)"}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Footer Guidance Strip */}
      <footer className="w-full bg-slate-950 border-t border-slate-800 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400 block">
              Current Loop Status &amp; Next Action
            </span>
            <p className="text-slate-200 text-sm font-medium">
              {!latestRun
                ? "Run Baseline against v1.0. It should look healthy."
                : hasCritical
                ? "Critical authority-claim failure found! Open Failure Explorer to discover variants and synthesize a permanent regression test."
                : hasBaseline
                ? "Baseline is clean. Click Discover Failures to hunt the authority-claim cheat."
                : gateVerdict === "PASS"
                ? "Gate flipped to PASS. The cheat is now a permanent regression."
                : "Release gate is BLOCK. Switch to v1.1 and run the regression suite."}
            </p>
          </div>

          <div className="flex space-x-3 shrink-0">
            <button
              onClick={() => router.push("/failures")}
              className="text-sm bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              Open Failure Explorer
            </button>
            <button
              onClick={() => router.push("/regressions")}
              className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              Open Regression Center
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
