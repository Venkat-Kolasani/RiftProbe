"use client";

import Link from "next/link";
import Navbar, { Stepper } from "@/components/Navbar";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between">
      <div>
        <Navbar />
        
        <main className="max-w-4xl mx-auto p-8 space-y-8 my-auto">
          {/* Hero */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-cyan-400">RiftProbe</h1>
            <p className="text-slate-200 text-sm font-medium">
              Find how an AI agent fails. Freeze that failure as a permanent release gate.
            </p>
          </div>

          {/* 3-line explanation */}
          <p className="text-sm text-slate-400 leading-relaxed">
            RiftProbe runs a support agent (RetailOps) through normal and adversarial scenarios,
            catches policy violations like unverified refunds, and turns each confirmed failure
            into a regression test that blocks a broken release.
          </p>

          {/* 5-step horizontal preview strip */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400 block mb-3">
              Automated Closed Loop
            </span>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center font-bold text-xs">1</div>
                <div>
                  <span className="font-semibold text-slate-300 block">1. Baseline</span>
                  <span className="text-xs text-slate-500">Run 20 healthy scenarios</span>
                </div>
              </div>
              <span className="text-slate-600">&rarr;</span>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center font-bold text-xs">2</div>
                <div>
                  <span className="font-semibold text-slate-300 block">2. Discover</span>
                  <span className="text-xs text-slate-500">Hunt authority-bypass cheat</span>
                </div>
              </div>
              <span className="text-slate-600">&rarr;</span>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center font-bold text-xs">3</div>
                <div>
                  <span className="font-semibold text-slate-300 block">3. Variants</span>
                  <span className="text-xs text-slate-500">Generate adversarial cluster</span>
                </div>
              </div>
              <span className="text-slate-600">&rarr;</span>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center font-bold text-xs">4</div>
                <div>
                  <span className="font-semibold text-slate-300 block">4. Regression</span>
                  <span className="text-xs text-slate-500">Freeze permanent test</span>
                </div>
              </div>
              <span className="text-slate-600">&rarr;</span>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center font-bold text-xs">5</div>
                <div>
                  <span className="font-semibold text-slate-300 block">5. Release Gate</span>
                  <span className="text-xs text-slate-500">BLOCK v1.0, PASS v1.1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Side by side versions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg space-y-1">
              <span className="text-xs font-mono font-medium text-rose-400">v1.0 — Vulnerable</span>
              <p className="text-sm text-slate-300">
                Skips identity verification under an authority claim.
              </p>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg space-y-1">
              <span className="text-xs font-mono font-medium text-emerald-400">v1.1 — Corrected</span>
              <p className="text-sm text-slate-300">
                Always enforces identity verification before refunds.
              </p>
            </div>
          </div>

          {/* Primary CTA */}
          <div>
            <Link
              href="/dashboard"
              className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm px-6 py-3 rounded-lg transition-colors"
            >
              Open Run Dashboard &rarr;
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
