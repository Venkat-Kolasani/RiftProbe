"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { listRegressions, checkReleaseGate, replayRegression } from "@/lib/api";

interface RegressionItem {
  id: string;
  goal: string;
  expected_invariants: string[];
  threshold: number;
  status?: {
    agent_version: string;
    passed: boolean;
    verdict: string;
    score: number;
    violated_invariants: string[];
  };
}

export default function RegressionCenter() {
  const [versionLabel, setVersionLabel] = useState("v1.0");
  const [regressions, setRegressions] = useState<RegressionItem[]>([]);
  const [releaseGate, setReleaseGate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const loadRegressionData = async (version: string) => {
    setLoading(true);
    try {
      const [listRes, gateRes] = await Promise.all([
        listRegressions(version),
        checkReleaseGate(version)
      ]);

      if (listRes && listRes.regression_tests) {
        setRegressions(listRes.regression_tests);
      }
      if (gateRes) {
        setReleaseGate(gateRes);
      }
    } catch (e) {
      console.error("Failed to load regression center data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegressionData(versionLabel);
  }, [versionLabel]);

  const handleReplayTest = async (regId: string) => {
    setReplayingId(regId);
    try {
      await replayRegression(regId, versionLabel);
      await loadRegressionData(versionLabel);
    } catch (e: any) {
      alert(`Replay error: ${e.message}`);
    } finally {
      setReplayingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between">
      <div>
        <Navbar currentStep={versionLabel === "v1.1" && releaseGate?.verdict === "PASS" ? 5 : 4} />
        
        <main className="max-w-6xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">Regression Center</h1>
              <p className="text-slate-400 mt-1 font-normal text-sm">
                Permanent regression suite and automated Release Gate verification
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <label className="text-xs font-medium text-slate-400">Evaluate Agent Version:</label>
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

          {/* Release Gate Badge Card */}
          {releaseGate && (
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400 block mb-1">
                    Release Gate Status
                  </span>
                  <p className="text-slate-300 text-sm">
                    Automated release gate evaluation for version <span className="font-mono text-cyan-400">{versionLabel}</span>
                  </p>
                </div>

                <span
                  className={`text-3xl font-semibold px-6 py-2 rounded-lg font-mono uppercase border ${
                    releaseGate.verdict === "PASS"
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                      : "bg-rose-950 text-rose-400 border-rose-800"
                  }`}
                >
                  {releaseGate.verdict}
                </span>
              </div>

              <p className="text-xs font-mono text-slate-400 border-t border-slate-700 pt-3 mt-4">
                Reason: <span className="text-slate-200">{releaseGate.reason}</span>
              </p>
            </div>
          )}

          {/* Protected Regression Test Suite Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Protected Regression Suite ({regressions.length} Tests)
              </h2>

              <button
                onClick={() => loadRegressionData(versionLabel)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Refresh Suite &amp; Gate
              </button>
            </div>

            {loading ? (
              <div className="border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500 rounded-lg">
                Loading regression suite...
              </div>
            ) : regressions.length === 0 ? (
              <div className="border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500 rounded-lg">
                No regression tests yet. Create one from a critical failure in the Failure Explorer.
              </div>
            ) : (
              regressions.map((reg) => {
                const status = reg.status as any || {};
                const isPass = status.passed;

                return (
                  <div
                    key={reg.id}
                    className="bg-slate-800 border border-slate-700 p-6 rounded-lg flex justify-between items-center space-x-6"
                  >
                    <div className="space-y-1">
                      <div className="text-slate-100 font-medium text-sm">{reg.goal}</div>
                      <div className="text-xs text-rose-400 font-mono">
                        Expected Invariant: {reg.expected_invariants?.join(", ")}
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 shrink-0">
                      <div className="text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block mb-0.5">
                          Current Status ({versionLabel})
                        </span>
                        <span
                          className={`text-xs font-mono font-medium px-2.5 py-1 rounded border ${
                            isPass
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : "bg-rose-950 text-rose-400 border-rose-800"
                          }`}
                        >
                          {status.verdict || (isPass ? "PASS" : "FAIL")}
                        </span>
                      </div>

                      <button
                        onClick={() => handleReplayTest(reg.id)}
                        disabled={replayingId === reg.id}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3.5 py-2 rounded-lg font-medium transition-colors"
                      >
                        {replayingId === reg.id ? "Replaying..." : "Replay Test"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
      
      {/* Footer Strip */}
      <footer className="w-full bg-slate-950 border-t border-slate-800 p-6 mt-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-slate-200 text-sm font-medium">
            v1.0 still cheats, so release is blocked. v1.1 enforces verification, so the same regression passes.
          </p>
        </div>
      </footer>
    </div>
  );
}
