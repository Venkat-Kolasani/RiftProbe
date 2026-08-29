"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { checkReleaseGate } from "@/lib/api";

export function Stepper({ currentStep }: { currentStep?: number }) {
  const steps = [
    { num: 1, label: "1. Baseline", desc: "Run 20 healthy template scenarios" },
    { num: 2, label: "2. Discover", desc: "Hunt for authority-bypass vulnerability" },
    { num: 3, label: "3. Variants", desc: "Generate adversarial failure cluster" },
    { num: 4, label: "4. Regression", desc: "Freeze failure into permanent test" },
    { num: 5, label: "5. Release Gate", desc: "Gate release: BLOCK v1.0, PASS v1.1" },
  ];

  return (
    <div className="bg-slate-950 border-b border-slate-800 px-6 py-3">
      <div className="max-w-6xl mx-auto flex justify-between items-center text-xs">
        {steps.map((step) => {
          const isActive = currentStep ? step.num === currentStep : false;
          const isDone = currentStep ? step.num < currentStep : false;
          return (
            <div key={step.num} className="flex items-center space-x-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  isActive
                    ? "bg-cyan-500 text-slate-950"
                    : isDone
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {step.num}
              </div>
              <div className="hidden sm:block">
                <span
                  className={`font-semibold ${
                    isActive ? "text-cyan-400" : isDone ? "text-emerald-400" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-xs text-slate-500 block">{step.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Navbar({ currentStep = 1 }: { currentStep?: number }) {
  const pathname = usePathname();
  const [gateChip, setGateChip] = useState<{ verdict: string; version: string } | null>(null);

  useEffect(() => {
    checkReleaseGate("v1.0")
      .then((res) => {
        if (res && res.verdict) {
          setGateChip({ verdict: res.verdict, version: "v1.0" });
        }
      })
      .catch(() => {});
  }, []);

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/failures", label: "Failure Explorer" },
    { href: "/regressions", label: "Regression Center" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
      <nav className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-semibold text-cyan-400">
              RiftProbe
            </span>
          </Link>
          <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-mono">
            RetailOps Demo
          </span>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex space-x-6">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive ? "text-cyan-400 border-b-2 border-cyan-400 pb-0.5" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {gateChip && (
            <div className="border-l border-slate-800 pl-4 flex items-center space-x-2">
              <span className="text-xs text-slate-500 uppercase font-mono">Gate:</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                  gateChip.verdict === "PASS"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-rose-950 text-rose-400 border border-rose-800"
                }`}
              >
                {gateChip.verdict}
              </span>
            </div>
          )}
        </div>
      </nav>
      <Stepper currentStep={currentStep} />
    </header>
  );
}
