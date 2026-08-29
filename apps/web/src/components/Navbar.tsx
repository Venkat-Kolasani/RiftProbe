"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Run Dashboard" },
    { href: "/failures", label: "Failure Explorer" },
    { href: "/regressions", label: "Regression Center" },
  ];

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          RiftProbe
        </span>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
          BuildSprint 2026
        </span>
      </div>
      <div className="flex space-x-6">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive ? "text-cyan-400 border-b-2 border-cyan-400 pb-1" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
