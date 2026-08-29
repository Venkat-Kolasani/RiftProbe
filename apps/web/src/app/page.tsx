"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import PageShell from "@/components/PageShell";

const LOOP_STEPS = [
  { label: "Baseline", desc: "20 healthy scenarios" },
  { label: "Discover", desc: "Hunt policy cheats" },
  { label: "Variants", desc: "Adversarial cluster" },
  { label: "Regression", desc: "Permanent test" },
  { label: "Release Gate", desc: "BLOCK → PASS" },
];

export default function LandingPage() {
  return (
    <PageShell>
      <Navbar showStepper={false} />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-16 text-center">
        <p className="eyebrow mb-8">
          adaptive testing · policy invariants · release gates
        </p>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          Find how your AI agent{" "}
          <span className="text-brand-orange">fails.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-muted">
          RiftProbe runs a support agent through normal and adversarial scenarios,
          catches policy violations like{" "}
          <span className="text-white">unverified refunds</span>, and turns each
          confirmed failure into a regression test that{" "}
          <span className="text-white">blocks a broken release</span>.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/dashboard" className="btn-primary px-8 py-3 text-base">
            Open Dashboard
            <span aria-hidden>→</span>
          </Link>
          <Link href="/failures" className="btn-secondary">
            View Failures
          </Link>
        </div>

        <p className="mt-6 text-xs text-brand-muted">
          RetailOps sandbox · v1.0 vulnerable · v1.1 corrected · local demo
        </p>

        {/* Architecture diagram */}
        <div className="card-surface mx-auto mt-20 max-w-4xl p-8 text-left shadow-glow-sm">
          <div className="mb-8 flex justify-center">
            <span className="badge-orange">
              CLOSED LOOP · ADAPTIVE EXPERIMENTATION
            </span>
          </div>

          <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
            {LOOP_STEPS.map((step, i) => (
              <div key={step.label} className="flex flex-1 items-center gap-3">
                <div className="card min-w-0 flex-1 p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-brand-surface text-xs font-semibold text-brand-orange">
                    {i + 1}
                  </div>
                  <div className="text-sm font-medium text-white">{step.label}</div>
                  <div className="mt-0.5 text-xs text-brand-muted">{step.desc}</div>
                </div>
                {i < LOOP_STEPS.length - 1 && (
                  <span className="hidden text-brand-muted sm:block">→</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="card border-red-900/40 bg-red-950/20 p-4">
              <div className="text-xs font-medium text-red-400">v1.0 — Vulnerable</div>
              <p className="mt-1 text-sm text-brand-muted">
                Skips identity verification when user claims manager authority.
              </p>
            </div>
            <div className="card border-emerald-900/40 bg-emerald-950/20 p-4">
              <div className="text-xs font-medium text-emerald-400">v1.1 — Corrected</div>
              <p className="mt-1 text-sm text-brand-muted">
                Always enforces identity verification before any refund.
              </p>
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
