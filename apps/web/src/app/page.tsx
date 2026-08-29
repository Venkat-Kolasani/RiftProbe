"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { createRun } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RunDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [versionLabel, setVersionLabel] = useState("v1.0");

  const handleDiscoverFailures = async () => {
    setLoading(true);
    try {
      const res = await createRun(versionLabel);
      if (res.run_id) {
        router.push(`/runs/${res.run_id}`);
      }
    } catch (e: any) {
      alert(`Error starting run: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunRegressionSuite = () => {
    router.push("/regressions");
  };

  return (
    <div>
      <Navbar />
      <main className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Run Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Adaptive AI Agent Failure Discovery &amp; Regression Testing Platform
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 font-mono"
            >
              <option value="v1.0">v1.0 (Vulnerable Agent)</option>
              <option value="v1.1">v1.1 (Corrected Agent)</option>
            </select>

            <button
              onClick={handleDiscoverFailures}
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 shadow-lg shadow-cyan-900/30"
            >
              {loading ? "Starting..." : "Discover Failures"}
            </button>

            <button
              onClick={handleRunRegressionSuite}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium text-sm transition-all"
            >
              Run Regression Suite
            </button>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <span className="text-sm text-slate-400 font-medium">Health Score</span>
            <div className="text-3xl font-extrabold text-cyan-400 mt-2">100.0%</div>
            <span className="text-xs text-slate-500 mt-1 block">Baseline score (v1.0)</span>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <span className="text-sm text-slate-400 font-medium">Total Scenarios</span>
            <div className="text-3xl font-extrabold text-slate-100 mt-2">20</div>
            <span className="text-xs text-slate-500 mt-1 block">Baseline test set</span>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <span className="text-sm text-slate-400 font-medium">Passed Scenarios</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">20</div>
            <span className="text-xs text-emerald-500 mt-1 block">100% pass rate</span>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
            <span className="text-sm text-slate-400 font-medium">Critical Failures</span>
            <div className="text-3xl font-extrabold text-rose-400 mt-2">0</div>
            <span className="text-xs text-slate-500 mt-1 block">Pending mutation search</span>
          </div>
        </div>

        {/* Behavior Drift & Closed Loop Summary */}
        <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-200">Adaptive Experimentation Loop</h2>
          <div className="grid grid-cols-3 gap-4 text-sm text-slate-300">
            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
              <span className="text-cyan-400 font-semibold block mb-1">1. Baseline Search</span>
              Runs 20 seed scenarios against RetailOps sandbox.
            </div>
            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
              <span className="text-cyan-400 font-semibold block mb-1">2. Adversarial Mutation</span>
              Generates targeted variants upon surfacing a critical failure.
            </div>
            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
              <span className="text-cyan-400 font-semibold block mb-1">3. Permanent Regressions</span>
              Synthesizes regression records &amp; enforces Release Gate.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
