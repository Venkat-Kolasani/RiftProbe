export default function PageShell({
  children,
  glow = true,
}: {
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div className="app-shell app-grid-bg">
      {glow && <div className="app-glow pointer-events-none absolute inset-0" />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
