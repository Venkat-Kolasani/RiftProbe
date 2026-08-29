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
    <div>
      <Navbar currentStep={versionLabel === "v1.1" && releaseGate?.verdict === "PASS" ? 5 : 4} />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Title Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Regression Center</h1>
            <p className="text-slate-400 text-sm mt-1">
              Permanent regression suite and automated Release Gate verification
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            <label className="text-xs text-slate-400 font-mono font-medium">Evaluate Agent Version:</label>
            <select
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-lg px-3 py-1.5 font-mono font-bold"
            >
              <option value="v1.0">v1.0 (Vulnerable Agent)</option>
              <option value="v1.1">v1.1 (Corrected Agent)</option>
            </select>
          </div>
        </div>

        {/* Giant Release Gate Badge Card */}
        {releaseGate && (
          <div className="bg-slate-800/90 border-2 border-slate-700 p-6 rounded-xl space-y-3 shadow-xl">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider block">
                  Release Gate Status ({versionLabel})
                </span>
                <p className="text-slate-300 text-xs mt-0.5">
                  {versionLabel === "v1.0"
                    ? "v1.0 still cheats on authority claims, so release is BLOCKED."
                    : "v1.1 enforces identity verification, so the same regression PASSES."}
                </p>
              </div>

              <span
                className={`text-3xl font-black px-6 py-2 rounded-xl font-mono tracking-wider shadow-lg ${
                  releaseGate.verdict === "PASS"
                    ? "bg-emerald-950 text-emerald-400 border-2 border-emerald-500 shadow-emerald-950/50"
                    : "bg-rose-950 text-rose-400 border-2 border-rose-600 shadow-rose-950/50 animate-pulse"
                }`}
              >
                {releaseGate.verdict}
              </span>
            </div>

            <p className="text-xs font-mono text-slate-400 border-t border-slate-700/80 pt-3">
              Reason: <span className="text-slate-200">{releaseGate.reason}</span>
            </p>
          </div>
        )}

        {/* Protected Regression Test Suite Table */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Protected Regression Suite ({regressions.length} Tests)
            </h2>

            <button
              onClick={() => loadRegressionData(versionLabel)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-medium"
            >
              Refresh Suite &amp; Gate
            </button>
          </div>

          {loading ? (
            <div className="bg-slate-800/40 border border-slate-800 p-8 text-center text-slate-500 rounded-xl font-mono text-sm">
              Loading regression suite...
            </div>
          ) : regressions.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-800 p-8 text-center text-slate-400 rounded-xl space-y-2">
              <p className="font-semibold text-slate-300">No regression tests yet.</p>
              <p className="text-xs text-slate-500">Create one from a critical failure in the Failure Explorer.</p>
            </div>
          ) : (
            regressions.map((reg) => {
              const status = reg.status || {};
              const isPass = status.passed;

              return (
                <div
                  key={reg.id}
                  className="bg-slate-800/90 border border-slate-700 p-6 rounded-xl flex justify-between items-center shadow-md space-x-6"
                >
                  <div className="space-y-1">
                    <div className="text-slate-100 font-semibold text-base">{reg.goal}</div>
                    <div className="text-xs text-rose-400 font-mono">
                      Expected Invariant: {reg.expected_invariants?.join(", ")}
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 shrink-0">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">
                        Current Status ({versionLabel})
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded font-mono ${
                          isPass
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}
                      >
                        {status.verdict || (isPass ? "PASS" : "FAIL")}
                      </span>
                    </div>

                    <button
                      onClick={() => handleReplayTest(reg.id)}
                      disabled={replayingId === reg.id}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3.5 py-2 rounded-lg font-medium transition-all"
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
  );
}
