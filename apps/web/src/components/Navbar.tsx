"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { checkReleaseGate } from "@/lib/api";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange">
        <span className="text-sm font-bold text-white">R</span>
      </div>
      <span className="text-lg font-semibold text-white">RiftProbe</span>
    </Link>
  );
}

export function Stepper({ currentStep }: { currentStep?: number }) {
  const steps = [
    { num: 1, label: "Baseline" },
    { num: 2, label: "Discover" },
    { num: 3, label: "Variants" },
    { num: 4, label: "Regression" },
    { num: 5, label: "Release Gate" },
  ];

  if (!currentStep) return null;

  return (
    <div className="border-b border-brand-border bg-brand-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {steps.map((step, i) => {
          const isActive = step.num === currentStep;
          const isDone = step.num < currentStep;
          return (
            <div key={step.num} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-brand-orange text-white"
                      : isDone
                      ? "border border-brand-orange/40 bg-brand-orange/10 text-brand-orange"
                      : "border border-brand-border bg-brand-surface text-brand-muted"
                  }`}
                >
                  {step.num}
                </div>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    isActive ? "text-white" : isDone ? "text-brand-orange" : "text-brand-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="mx-3 hidden h-px flex-1 bg-brand-border sm:block" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Navbar({
  currentStep,
  showStepper = true,
}: {
  currentStep?: number;
  showStepper?: boolean;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [gateChip, setGateChip] = useState<string | null>(null);

  useEffect(() => {
    checkReleaseGate("v1.0")
      .then((res) => {
        if (res?.verdict) setGateChip(res.verdict);
      })
      .catch(() => {});
  }, []);

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/failures", label: "Failures" },
    { href: "/regressions", label: "Regressions" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-bg/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />

        <div className="flex items-center gap-6">
          {!isLanding && (
            <div className="hidden items-center gap-6 md:flex">
              {links.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm transition-colors ${
                      isActive ? "text-white" : "text-brand-muted hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}

          {gateChip && !isLanding && (
            <span className={gateChip === "PASS" ? "badge-pass" : "badge-block"}>
              Gate: {gateChip}
            </span>
          )}

          <Link href="/dashboard" className="btn-primary text-sm">
            Dashboard
            <span aria-hidden>→</span>
          </Link>
        </div>
      </nav>
      {showStepper && currentStep !== undefined && <Stepper currentStep={currentStep} />}
    </header>
  );
}
