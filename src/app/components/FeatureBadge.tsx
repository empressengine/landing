export function FeatureBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center px-3 py-1.5 border border-white/10 bg-white/5 backdrop-blur-sm text-xs text-white/80 rounded-md">
      {children}
    </div>
  );
}
