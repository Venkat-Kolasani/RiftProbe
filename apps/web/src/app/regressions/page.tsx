"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";
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
        checkReleaseGate(version),
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
    <PageShell glow={false}>
      <Navbar
        currentStep={
          versionLabel === "v1.1" && releaseGate?.verdict === "PASS" ? 5 : 4
        }
      />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="flex flex-col gap-4 border-b border-brand-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2">Regression Center</p>
            <h1 className="text-2xl font-semibold text-white">
              Permanent regression suite & release gate
            </h1>
            <p className="mt-1 text-sm text-brand-muted">
              Confirmed failures replayed automatically before every release.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-brand-muted">Evaluate agent version</label>
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

        {releaseGate && (
          <div className="card-surface space-y-3 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="section-label mb-1">Release Gate Status</p>
                <p className="text-sm text-brand-muted">
                  Automated evaluation for version{" "}
                  <span className="font-mono text-brand-orange">{versionLabel}</span>
                </p>
              </div>
              <span
                className={
                  releaseGate.verdict === "PASS"
                    ? "badge-pass px-6 py-2 text-2xl"
                    : "badge-block px-6 py-2 text-2xl"
                }
              >
                {releaseGate.verdict}
              </span>
            </div>
            <p className="border-t border-brand-border pt-3 font-mono text-xs text-brand-muted">
              Reason: <span className="text-white">{releaseGate.reason}</span>
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="section-label">
              Protected regression suite ({regressions.length} tests)
            </p>
            <button
              onClick={() => loadRegressionData(versionLabel)}
              className="btn-secondary text-xs"
            >
              Refresh suite &amp; gate
            </button>
          </div>

          {loading ? (
            <div className="empty-state">Loading regression suite…</div>
          ) : regressions.length === 0 ? (
            <div className="empty-state">
              No regression tests yet. Create one from a critical failure in the Failure
              Explorer.
            </div>
          ) : (
            <div className="space-y-3">
              {regressions.map((reg) => {
                const status = (reg.status as any) || {};
                const isPass = status.passed;

                return (
                  <div
                    key={reg.id}
                    className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">{reg.goal}</p>
                      <p className="font-mono text-xs text-red-400">
                        Expected invariant: {reg.expected_invariants?.join(", ")}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-6">
                      <div className="text-center">
                        <p className="section-label mb-1">Status ({versionLabel})</p>
                        <span className={isPass ? "badge-pass" : "badge-block"}>
                          {status.verdict || (isPass ? "PASS" : "FAIL")}
                        </span>
                      </div>

                      <button
                        onClick={() => handleReplayTest(reg.id)}
                        disabled={replayingId === reg.id}
                        className="btn-secondary text-xs disabled:opacity-50"
                      >
                        {replayingId === reg.id ? "Replaying…" : "Replay Test"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="mt-auto border-t border-brand-border bg-brand-surface/50">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <p className="text-sm text-white">
            v1.0 still cheats, so release is blocked. v1.1 enforces verification, so the
            same regression passes.
          </p>
        </div>
      </footer>
    </PageShell>
  );
}
